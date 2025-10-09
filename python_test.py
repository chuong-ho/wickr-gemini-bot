#!/usr/bin/env python3
import sys
import json
import boto3
from google import genai

def get_gemini_api_key():
    client = boto3.client('secretsmanager', region_name='us-gov-west-1')
    response = client.get_secret_value(SecretId='gemini_pro_api_key')
    secret = json.loads(response['SecretString'])
    return secret['api_key']

def send_to_gemini(prompt):
    api_key = get_gemini_api_key()
    client = genai.Client(api_key=api_key)

    
    response = client.models.generate_content(
        model='models/gemini-2.5-flash',
        contents=[{'parts': [{'text': prompt}]}]
    )
    
    return response.text

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python python_test.py 'your prompt here'")
        sys.exit(1)
    
    prompt = sys.argv[1]
    result = send_to_gemini(prompt)
    print(result)
