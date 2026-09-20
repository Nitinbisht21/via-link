import os
import re
import instaloader
from instaloader.nodeiterator import NodeIterator

_instaloader_instance = None

URL_REGEX = re.compile(r'(https?://[^\s]+|www\.[^\s]+)', re.IGNORECASE)

def extract_links(text):
    if not text:
        return []
    return URL_REGEX.findall(text)

def parse_comment_node(node):
    owner = node.get('owner', {}) if isinstance(node.get('owner'), dict) else {}
    username = owner.get('username', 'unknown')
    text = node.get('text', '')
    likes = node.get('edge_liked_by', {}).get('count', 0) if isinstance(node.get('edge_liked_by'), dict) else 0
    replies = node.get('edge_threaded_comments', {}).get('count', 0) if isinstance(node.get('edge_threaded_comments'), dict) else 0
    is_verified = owner.get('is_verified', False)
    profile_pic_url = owner.get('profile_pic_url', '')
    links = extract_links(text)
    
    return {
        "id": str(node.get("id", "")),
        "username": username,
        "text": text,
        "likes": likes,
        "replies": replies,
        "links": links,
        "is_verified": is_verified,
        "profile_pic_url": profile_pic_url
    }

def get_instaloader_instance():
    global _instaloader_instance
    if _instaloader_instance is not None:
        return _instaloader_instance
        
    L = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
        max_connection_attempts=2
    )
    
    username = os.getenv("IG_USERNAME")
    password = os.getenv("IG_PASSWORD")
    session_id = os.getenv("IG_SESSIONID")
    
    # 1. Direct sessionid from .env
    if session_id:
        try:
            user_id = session_id.split("%3A")[0] if "%3A" in session_id else ""
            cookie_dict = {"sessionid": session_id.strip()}
            if user_id:
                cookie_dict["ds_user_id"] = user_id
            L.context.update_cookies(cookie_dict)
            logged_in_user = L.test_login()
            if logged_in_user:
                L.context.username = logged_in_user
                try:
                    L.save_session_to_file()
                except Exception:
                    pass
                print(f"Loaded Instagram session via IG_SESSIONID for '{logged_in_user}'.")
                _instaloader_instance = L
                return _instaloader_instance
        except Exception as e:
            print(f"Could not apply IG_SESSIONID: {e}")

    # 2. Try loading an existing session file
    session_loaded = False
    if username:
        try:
            L.load_session_from_file(username)
            print(f"Loaded existing Instaloader session for '{username}'.")
            session_loaded = True
        except Exception:
            pass

    # 3. Fall back to username and password
    if not session_loaded and username and password:
        try:
            print(f"Logging in to Instagram as '{username}'...")
            L.login(username, password)
            L.save_session_to_file()
            print("Instagram login successful and session saved.")
        except Exception as e:
            print(f"Instagram login failed: {e}")
                
    _instaloader_instance = L
    return _instaloader_instance

def get_top_comments(reel_url, max_comments=30):
    L = get_instaloader_instance()
    
    try:
        if '/reel/' in reel_url:
            shortcode = reel_url.split('/reel/')[1].split('/')[0].split('?')[0]
        elif '/reels/' in reel_url:
            shortcode = reel_url.split('/reels/')[1].split('/')[0].split('?')[0]
        elif '/p/' in reel_url:
            shortcode = reel_url.split('/p/')[1].split('/')[0].split('?')[0]
        else:
            raise ValueError("Could not extract shortcode from URL")
    except Exception as e:
        return [{"error": True, "message": f"Error extracting shortcode: {e}"}]

    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        comments_list = []
        seen_ids = set()
        
        # 1. Check embedded edges in post metadata (fast)
        edges = post._node.get('edge_media_to_parent_comment', {}).get('edges', [])
        for edge in edges:
            node = edge.get('node', {})
            parsed = parse_comment_node(node)
            if parsed['text'] and parsed['id'] not in seen_ids:
                seen_ids.add(parsed['id'])
                comments_list.append(parsed)

        # 2. Web GraphQL query hash (reliable, extracts likes, replies, and links)
        if len(comments_list) < max_comments:
            try:
                graphql_iter = NodeIterator(
                    L.context,
                    '97b41c52301f77ce508f55e66d17620e',
                    lambda d: d['data']['shortcode_media']['edge_media_to_parent_comment'],
                    parse_comment_node,
                    {'shortcode': post.shortcode},
                    f'https://www.instagram.com/p/{post.shortcode}/',
                )
                for item in graphql_iter:
                    if item['id'] not in seen_ids:
                        seen_ids.add(item['id'])
                        comments_list.append(item)
                    if len(comments_list) >= max_comments:
                        break
            except Exception as gql_err:
                print(f"GraphQL comment fetch error: {gql_err}")

        # 3. Fallback to post.get_comments() if needed
        if not comments_list:
            try:
                for comment in post.get_comments():
                    text = getattr(comment, 'text', '')
                    c_id = str(getattr(comment, 'id', ''))
                    if c_id not in seen_ids and text:
                        seen_ids.add(c_id)
                        comments_list.append({
                            "id": c_id,
                            "username": getattr(comment.owner, 'username', 'unknown') if hasattr(comment, 'owner') and comment.owner else 'unknown',
                            "text": text,
                            "likes": getattr(comment, 'likes_count', 0) or 0,
                            "replies": 0,
                            "links": extract_links(text),
                            "is_verified": False,
                            "profile_pic_url": ""
                        })
                    if len(comments_list) >= max_comments:
                        break
            except Exception:
                pass
                
        if not comments_list:
            return [{"error": False, "message": "No comments found or comments are disabled on this reel."}]
            
        return comments_list

    except instaloader.exceptions.LoginRequiredException:
        return [{
            "error": True,
            "message": "⚠️ Instagram blocked the request: Login required. Please check that IG_SESSIONID in .env is valid."
        }]
    except Exception as e:
        return [{"error": True, "message": f"⚠️ Error fetching comments: {str(e)}"}]



