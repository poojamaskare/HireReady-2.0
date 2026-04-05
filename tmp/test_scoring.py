
import sys
import os
import json

# Add project root to sys.path
sys.path.append(os.getcwd())

def test_resume_logic():
    print("Testing Resume Analysis Logic...")
    from services.feature_analyzer import evaluate_resume_structure, SKILL_FEATURE_KEYS
    
    # Test 1: Structure Evaluation
    good_resume = """
    EXPERIENCE
    Software Engineer at Google
    * Developed high-scale systems
    * Optimized database queries
    
    PROJECTS
    1. HireReady 2.0: AI Career Platform
    2. Portfolio: Personal website
    
    SKILLS
    Python, Java, React, SQL, AWS, Docker
    """
    
    score = evaluate_resume_structure(good_resume)
    print(f"Good Resume Score: {score}/10")
    assert score > 5
    
    bad_resume = "this is just a bunch of text without any headers or bullet points just random things written here and there no structure at all"
    score_bad = evaluate_resume_structure(bad_resume)
    print(f"Bad Resume Score: {score_bad}/10")
    assert score_bad < 5
    
    # Test 2: Skill Patterns (Check a few of the new ones)
    from services.feature_analyzer import build_complete_feature_vector
    fvec = build_complete_feature_vector("I know C++14, AWS, and DynamoDB")
    
    detected = [k for k, v in fvec.items() if k in SKILL_FEATURE_KEYS and v > 0]
    print(f"Detected Skills: {detected}")
    assert "C++" in detected or any("C++" in s for s in detected)
    assert "AWS" in detected
    
    print("Verification Successful!")

if __name__ == "__main__":
    try:
        test_resume_logic()
    except Exception as e:
        print(f"Verification Failed: {e}")
        sys.exit(1)
