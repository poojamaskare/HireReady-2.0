#!/usr/bin/env python3
"""
Test script to validate resume feature extraction improvements
"""

from services.feature_analyzer import extract_resume_features

# Sample resume text with various skills and projects
sample_resume = """
John Doe
Software Engineer

Skills:
- Python, Java, JavaScript
- React.js, Node.js, Express
- SQL, MongoDB
- AWS, Docker
- Machine Learning with TensorFlow
- Git, GitHub

Experience:
Backend Developer Intern at TechCorp (June 2023 - Aug 2023)
- Built REST APIs using Node.js and Express
- Implemented user authentication with JWT
- Deployed application on AWS EC2

Projects:
E-commerce Website
- Full-stack web application using React, Node.js, MongoDB
- Features: user registration, product catalog, shopping cart
- Deployed on Heroku

ML Image Classifier
- Built image classification model using Python and TensorFlow
- Achieved 95% accuracy on test dataset
- Used OpenCV for image preprocessing

Mobile App for Task Management
- Cross-platform app using React Native
- Features: task creation, deadline reminders, user notifications
- Integrated with Firebase for data storage

Education:
Bachelor of Engineering in Computer Science
CGPA: 8.5/10
"""

def test_feature_extraction():
    features = extract_resume_features(sample_resume)

    print("=== Feature Extraction Test ===")
    print(f"Skills detected: {sum(1 for v in features.items() if isinstance(v[1], int) and v[1] > 0 and not v[0].startswith('num_') and not v[0].startswith('internship_'))}")
    print(f"Internships detected: {sum(1 for k, v in features.items() if k.startswith('internship_') and v > 0)}")
    print(f"Total projects: {sum(v for k, v in features.items() if k.startswith('num_'))}")

    # Print detected skills
    detected_skills = [k for k, v in features.items() if isinstance(v, int) and v > 0 and not k.startswith('num_') and not k.startswith('internship_')]
    print(f"\nDetected skills: {detected_skills}")

    # Print project counts
    project_counts = {k: v for k, v in features.items() if k.startswith('num_')}
    print(f"Project counts: {project_counts}")

    # Print internships
    internships = {k: v for k, v in features.items() if k.startswith('internship_')}
    print(f"Internships: {internships}")

if __name__ == "__main__":
    test_feature_extraction()