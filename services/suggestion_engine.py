import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Initialize Groq client
api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=api_key) if api_key else None

def generate_suggestions(readiness_score, features, categories_scores, resume_text=""):
    """
    Generate 3-5 actionable, single-line suggestions to improve the resume score.
    Uses Groq API (Llama 3.3).
    """
    if not client:
        return ["Add more technical skills to your profile.", "Complete more industry projects.", "Add relevant internship experience."]

    prompt = f"""
    You are an expert career coach. Analyze this student's resume data and provide 3-5 high-impact suggestions to reach a 10/10 placement-ready score.
    
    Current Metrics:
    - Total Readiness: {readiness_score}/100
    - Education (CGPA): {categories_scores.get('edu', 0)}/10 (Missing: {', '.join(categories_scores.get('missing', {}).get('edu', []))})
    - Skills & Tech: {categories_scores.get('skill', 0)}/10 (Missing: {', '.join(categories_scores.get('missing', {}).get('skill', []))})
    - Contact Info: {categories_scores.get('contact', 0)}/10 (Missing: {', '.join(categories_scores.get('missing', {}).get('contact', []))})
    - Internships: {categories_scores.get('intern', 0)}/10 (Missing: {', '.join(categories_scores.get('missing', {}).get('intern', []))})
    - Experience: {categories_scores.get('exp', 0)}/10 (Missing: {', '.join(categories_scores.get('missing', {}).get('exp', []))})
    - Projects: {categories_scores.get('proj', 0)}/10 (Missing: {', '.join(categories_scores.get('missing', {}).get('proj', []))})

    Contextual Data:
    - Detected Skills: {', '.join(categories_scores.get('skills_list', []))}
    - Resume Preview: {resume_text[:1000] if resume_text else "No text provided"}

    Guidelines:
    1. Provide EXACTLY 3 to 5 suggestions.
    2. Each suggestion must be a SINGLE LINE (max 15 words).
    3. Make them actionable and specific. Focus HEAVILY on the "Missing" items listed above.
    4. Focus on the lowest-scoring categories first.
    5. DO NOT mention any AI model names or specific provider names.

    Return ONLY a JSON list of strings.
    Example: ["Add a mobile number to your contact details.", "Complete a project using React and Node.js.", "Add at least one technical internship."]
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-specdec",
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        result = json.loads(chat_completion.choices[0].message.content)
        # Handle different potential JSON structures from the AI
        if isinstance(result, list):
            return result[:5]
        if isinstance(result, dict):
            # Try to find a list value in the dict
            for val in result.values():
                if isinstance(val, list):
                    return val[:5]
        return ["Improve project documentation.", "Add more technical skills.", "Include internship details."]
    except Exception as e:
        print(f"Error generating suggestions: {e}")
        return ["Focus on gaining more internship experience.", "Build 2+ full-stack projects.", "Update your contact information."]
