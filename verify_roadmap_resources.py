import requests
import time

BASE_URL = "http://127.0.0.1:8000/api"

def verify_resources(role="Backend Developer"):
    print(f"Verifying resources for role: {role}")
    
    # Trigger generation
    resp = requests.post(f"{BASE_URL}/generate-role-learning-path", json={"role": role})
    if resp.status_code != 200:
        print(f"Error: {resp.status_code} - {resp.text}")
        return

    data = resp.json()
    courses = data.get("courses", [])
    certs = data.get("certificates", [])
    youtube = data.get("youtube", [])

    print(f"Found {len(courses)} courses, {len(certs)} certificates, {len(youtube)} videos.")
    
    # Check if they are direct links (not google search)
    google_links = [c for c in courses if "google.com/search" in (c.get("url") or "")]
    if google_links:
        print(f"WARNING: Found {len(google_links)} Google search links in courses.")
    else:
        print("SUCCESS: No Google search links found in courses.")

    # Check YouTube
    missing_vid = [v for v in youtube if not v.get("videoId")]
    if missing_vid:
        print(f"WARNING: Found {len(missing_vid)} videos with missing videoId.")
    else:
        print("SUCCESS: All videos have videoId.")

    if len(courses) >= 3 and len(certs) >= 2 and len(youtube) >= 3:
        print("SUCCESS: Target resource counts met.")
    else:
        print("FAILURE: Resource counts below target.")

if __name__ == "__main__":
    verify_resources()
