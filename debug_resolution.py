import sys
import os
# Add current dir to path
sys.path.append(os.getcwd())

from main import resolve_direct_link, resolve_youtube_video_id

def debug_resolution():
    print("Testing resolve_direct_link for 'Backend Developer course'...")
    res = resolve_direct_link("Backend Developer course")
    print(f"Result: {res}")
    
    print("\nTesting resolve_youtube_video_id for 'Backend Developer tutorial'...")
    vid = resolve_youtube_video_id("Backend Developer tutorial")
    print(f"Result: {vid}")

if __name__ == "__main__":
    debug_resolution()
