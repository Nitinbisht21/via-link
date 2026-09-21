import os
import re
import time
import datetime
import instaloader
from utils.comments import get_instaloader_instance

def clean_tag_name(tag):
    if not tag:
        return ""
    tag = tag.strip()
    # Check if a full explore URL was pasted (e.g. https://www.instagram.com/explore/tags/coding/)
    url_match = re.search(r'explore/tags/([^/?#&]+)', tag)
    if url_match:
        tag = url_match.group(1)
    # Strip leading #, spaces, and non-alphanumeric/underscore characters
    cleaned = re.sub(r'^[#＃]+', '', tag.strip())
    cleaned = re.sub(r'[^\w\d_]', '', cleaned)
    return cleaned.lower()

def format_time_ago(timestamp):
    if not timestamp:
        return "Unknown"
    try:
        now = time.time()
        diff = max(0, int(now - float(timestamp)))
        if diff < 60:
            return "Just now"
        elif diff < 3600:
            mins = diff // 60
            return f"{mins}m ago"
        elif diff < 86400:
            hours = diff // 3600
            return f"{hours}h ago"
        elif diff < 604800:
            days = diff // 86400
            return f"{days}d ago"
        elif diff < 2592000:
            weeks = diff // 604800
            return f"{weeks}w ago"
        elif diff < 31536000:
            months = diff // 2592000
            return f"{months}mo ago"
        else:
            years = diff // 31536000
            return f"{years}y ago"
    except Exception:
        return "Unknown"

def extract_medias_from_sections(sections):
    extracted = []
    seen_ids = set()

    for sec in sections:
        if not isinstance(sec, dict):
            continue
        lc = sec.get('layout_content', {})
        if not isinstance(lc, dict):
            continue

        # 1. one_by_two_item (vertical video clips / reels)
        obti = lc.get('one_by_two_item', {})
        if isinstance(obti, dict) and 'clips' in obti:
            clips = obti['clips']
            if isinstance(clips, dict) and 'items' in clips:
                for it in clips.get('items', []):
                    m = it.get('media') if isinstance(it, dict) and 'media' in it else it
                    if isinstance(m, dict) and 'code' in m and m.get('code') not in seen_ids:
                        seen_ids.add(m['code'])
                        extracted.append(m)
            elif isinstance(clips, dict) and 'media' in clips:
                m = clips['media']
                if isinstance(m, dict) and 'code' in m and m.get('code') not in seen_ids:
                    seen_ids.add(m['code'])
                    extracted.append(m)

        # 2. fill_items (reels and grid items)
        for it in lc.get('fill_items', []):
            m = it.get('media') if isinstance(it, dict) and 'media' in it else it
            if isinstance(m, dict) and 'code' in m and m.get('code') not in seen_ids:
                seen_ids.add(m['code'])
                extracted.append(m)

        # 3. medias (grid items)
        for it in lc.get('medias', []):
            m = it.get('media') if isinstance(it, dict) and 'media' in it else it
            if isinstance(m, dict) and 'code' in m and m.get('code') not in seen_ids:
                seen_ids.add(m['code'])
                extracted.append(m)

        # 4. four_grid
        for it in lc.get('four_grid', {}).get('medias', []):
            m = it.get('media') if isinstance(it, dict) and 'media' in it else it
            if isinstance(m, dict) and 'code' in m and m.get('code') not in seen_ids:
                seen_ids.add(m['code'])
                extracted.append(m)

    return extracted

def is_authentic_reel(m):
    """Ensure the media item is a genuine, playable Instagram Reel."""
    if not isinstance(m, dict):
        return False

    code = m.get('code')
    if not code:
        return False

    # 1. Must have playable video versions
    video_versions = m.get('video_versions', [])
    if not video_versions or not isinstance(video_versions, list):
        return False

    # 2. Exclude static images
    if m.get('media_type') == 1:
        return False

    # 3. For carousels, only allow if it explicitly has video versions
    if m.get('media_type') == 8 and not video_versions:
        return False

    # 4. Must be a Reel (product_type == 'clips', or has clips_metadata, or media_type == 2)
    is_clip = (
        m.get('product_type') == 'clips' or
        bool(m.get('clips_metadata')) or
        m.get('media_type') == 2 or
        m.get('video_duration', 0) > 0
    )
    return is_clip

def parse_reel_item(m):
    code = m.get('code')
    video_versions = m.get('video_versions', [])
    video_url = video_versions[0].get('url') if video_versions else None

    image_versions = m.get('image_versions2', {}).get('candidates', [])
    thumbnail_url = image_versions[0].get('url') if image_versions else None

    owner_username = "unknown"
    if m.get('user') and isinstance(m['user'], dict):
        owner_username = m['user'].get('username', 'unknown')

    caption_text = ""
    if m.get('caption') and isinstance(m['caption'], dict):
        caption_text = m['caption'].get('text', '') or ""

    # Timestamp & date formatting
    taken_at = m.get('taken_at')
    post_date = None
    time_ago = "Unknown"
    if taken_at:
        try:
            dt = datetime.datetime.fromtimestamp(int(taken_at), tz=datetime.timezone.utc)
            post_date = dt.strftime("%b %d, %Y %I:%M %p UTC")
            time_ago = format_time_ago(taken_at)
        except Exception:
            pass

    play_count = m.get('play_count') or m.get('ig_play_count') or m.get('view_count') or 0
    like_count = m.get('like_count', 0) or 0
    duration = round(float(m.get('video_duration', 0) or 0), 1)

    return {
        "shortcode": code,
        "reel_url": f"https://www.instagram.com/reel/{code}/",
        "video_url": video_url,
        "thumbnail": thumbnail_url,
        "owner": owner_username,
        "likes": int(like_count),
        "views": int(play_count),
        "duration": duration,
        "taken_at": int(taken_at) if taken_at else None,
        "post_date": post_date,
        "time_ago": time_ago,
        "caption": caption_text.strip()
    }

def get_top_reels_by_hashtag(raw_tag, limit=50):
    tag_name = clean_tag_name(raw_tag)
    if not tag_name:
        return {"status": "error", "message": "Please enter a valid hashtag (e.g. #ai, #coding, #fitness)."}

    L = get_instaloader_instance()

    try:
        hashtag = instaloader.Hashtag.from_name(L.context, tag_name)
    except instaloader.exceptions.QueryReturnedNotFoundException:
        return {"status": "error", "message": f"Hashtag #{tag_name} not found on Instagram."}
    except instaloader.exceptions.LoginRequiredException:
        return {"status": "error", "message": "Instagram login required. Please verify IG_SESSIONID in .env."}
    except Exception as e:
        err_msg = str(e)
        if any(w in err_msg.lower() for w in ["login_required", "logged out", "redirected to login", "401", "unauthorized"]):
            return {"status": "error", "message": "Instagram session expired or login required. Please update IG_SESSIONID in .env with an active session."}
        if "404" in err_msg:
            return {"status": "error", "message": f"Hashtag #{tag_name} was not found or has no content."}
        return {"status": "error", "message": f"Could not fetch hashtag #{tag_name}: {err_msg}"}

    all_raw_medias = []
    seen_codes = set()

    # 1. Primary extraction from Page 1 top sections
    top_dict = hashtag._node.get('top', {}) if isinstance(hashtag._node, dict) else {}
    if isinstance(top_dict, dict):
        sections = top_dict.get('sections', [])
        for m in extract_medias_from_sections(sections):
            code = m.get('code')
            if code and code not in seen_codes:
                seen_codes.add(code)
                all_raw_medias.append(m)

    # 2. Also check recent sections on Page 1 if available
    recent_dict = hashtag._node.get('recent', {}) if isinstance(hashtag._node, dict) else {}
    if isinstance(recent_dict, dict):
        recent_sections = recent_dict.get('sections', [])
        for m in extract_medias_from_sections(recent_sections):
            code = m.get('code')
            if code and code not in seen_codes:
                seen_codes.add(code)
                all_raw_medias.append(m)

    # 3. Paginate to fetch more sections if needed to reach requested limit
    next_max_id = top_dict.get('next_max_id')
    next_page = top_dict.get('next_page')
    max_pagination_attempts = 4  # Up to 4 pages to comfortably exceed 50+ validated reels

    while len([m for m in all_raw_medias if is_authentic_reel(m)]) < limit and next_max_id and max_pagination_attempts > 0:
        max_pagination_attempts -= 1
        try:
            params = {
                'tag_name': tag_name,
                'max_id': next_max_id,
                'page': next_page,
                '__a': 1,
                '__d': 'dis'
            }
            p_data = L.context.get_iphone_json('api/v1/tags/web_info/', params=params)
            data_dict = p_data.get('data', p_data)
            next_top = data_dict.get('top', {}) if isinstance(data_dict, dict) else {}
            p_sections = next_top.get('sections', [])
            
            new_items_found = 0
            for m in extract_medias_from_sections(p_sections):
                code = m.get('code')
                if code and code not in seen_codes:
                    seen_codes.add(code)
                    all_raw_medias.append(m)
                    new_items_found += 1

            next_max_id = next_top.get('next_max_id')
            next_page = next_top.get('next_page')
            if not new_items_found or not next_max_id:
                break
        except Exception as pag_err:
            print(f"Hashtag pagination notice: {pag_err}")
            break

    # 4. Filter strictly for authentic, playable Reels and parse data
    reels = []
    for m in all_raw_medias:
        if is_authentic_reel(m):
            reels.append(parse_reel_item(m))

    if not reels:
        return {
            "status": "error",
            "message": f"No valid video reels found for #{tag_name}. The hashtag may only have photo posts or restricted content."
        }

    # Sort into top liked and top viewed lists
    top_liked = sorted(reels, key=lambda r: r['likes'], reverse=True)[:limit]
    top_viewed = sorted(reels, key=lambda r: r['views'], reverse=True)[:limit]

    return {
        "status": "completed",
        "tag": tag_name,
        "media_count": hashtag.mediacount,
        "total_reels_found": len(reels),
        "top_liked": top_liked,
        "top_viewed": top_viewed
    }

