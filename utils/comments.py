import instaloader
import os

def get_top_comments(reel_url):
    username = os.getenv("IG_USERNAME")
    password = os.getenv("IG_PASSWORD")
    
    L = instaloader.Instaloader()
    
    if username and password:
        try:
            L.login(username, password)
        except Exception as e:
            print(f"Instaloader login failed: {e}")
    
    try:
        if '/reel/' in reel_url:
            shortcode = reel_url.split('/reel/')[1].split('/')[0]
        elif '/p/' in reel_url:
            shortcode = reel_url.split('/p/')[1].split('/')[0]
        else:
            raise ValueError("Could not extract shortcode from URL")
    except Exception as e:
        return [f"Error extracting shortcode: {e}"]

    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        
        comments_list = []
        for comment in post.get_comments():
            comments_list.append(f"{comment.owner.username}: {comment.text}")
            if len(comments_list) == 50:
                break
                
        if not comments_list:
            return ["No comments found or post has comments disabled."]
        return comments_list
    except instaloader.exceptions.LoginRequiredException:
        return ["⚠️ Instagram blocked the request: Login required.", "The dummy account provided was blocked by Instagram's anti-bot system.", "To fix this, provide an established account or load a valid session cookie."]
    except Exception as e:
        return [f"⚠️ Error fetching comments: {str(e)}"]
