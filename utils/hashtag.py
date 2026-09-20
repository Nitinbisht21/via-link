import os
import re
import instaloader
from utils.comments import get_instaloader_instance

def clean_tag_name(tag):
    if not tag:
        return ""
    # Strip leading #, spaces, and punctuation
    cleaned = re.sub(r'^[#＃]+', '', tag.strip())
    cleaned = re.sub(r'[^\w\d_]', '', cleaned)
    return cleaned.lower()

def extract_medias_from_sections(sections):
    extracted = []
    seen_ids = set()

    for sec in sections:
        if not isinstance(sec, dict):
            continue
        lc = sec.get('layout_content', {})
        if not isinstance(lc, dict):
            continue

        # 1. one_by_two_item (usually vertical video clips / reels)
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

        # 2. fill_items
        for it in lc.get('fill_items', []):
            m = it.get('media') if isinstance(it, dict) and 'media' in it else it
            if isinstance(m, dict) and 'code' in m and m.get('code') not in seen_ids:
                seen_ids.add(m['code'])
                extracted.append(m)

        # 3. medias
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

    # 1. Primary extraction from top sections
    top_dict = hashtag._node.get('top', {}) if isinstance(hashtag._node, dict) else {}
    if isinstance(top_dict, dict):
        sections = top_dict.get('sections', [])
        for m in extract_medias_from_sections(sections):
            code = m.get('code')
            if code and code not in seen_codes:
                seen_codes.add(code)
                all_raw_medias.append(m)

    # 2. Also check recent sections if available
    recent_dict = hashtag._node.get('recent', {}) if isinstance(hashtag._node, dict) else {}
    if isinstance(recent_dict, dict):
        recent_sections = recent_dict.get('sections', [])
        for m in extract_medias_from_sections(recent_sections):
            code = m.get('code')
            if code and code not in seen_codes:
                seen_codes.add(code)
                all_raw_medias.append(m)

    # 3. Transform and filter for Reels / Videos
    reels = []
    for m in all_raw_medias:
        video_versions = m.get('video_versions', [])
        play_count = m.get('play_count') or m.get('view_count') or 0
        duration = m.get('video_duration', 0)
        is_video = bool(video_versions or play_count > 0 or duration > 0 or m.get('media_type') == 2)

        # We specifically focus on reels & videos as requested
        if not is_video:
            continue

        caption_text = ""
        if m.get('caption') and isinstance(m['caption'], dict):
            caption_text = m['caption'].get('text', '') or ""

        image_versions = m.get('image_versions2', {}).get('candidates', [])
        thumbnail_url = image_versions[0].get('url') if image_versions else None
        video_url = video_versions[0].get('url') if video_versions else None

        owner_username = "unknown"
        if m.get('user') and isinstance(m['user'], dict):
            owner_username = m['user'].get('username', 'unknown')

        reels.append({
            "shortcode": m.get('code'),
            "reel_url": f"https://www.instagram.com/reel/{m.get('code')}/",
            "video_url": video_url,
            "thumbnail": thumbnail_url,
            "owner": owner_username,
            "likes": int(m.get('like_count', 0) or 0),
            "views": int(play_count or 0),
            "duration": round(float(duration or 0), 1),
            "caption": caption_text.strip()
        })

    if not reels:
        return {
            "status": "error",
            "message": f"No reels found for #{tag_name}. The hashtag may only have photo posts or restricted content."
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
