#!/usr/bin/env python3
"""
Simple HTTP server for Cygnos AI Agent
Run this script to start a local web server and open the Cygnos app in your browser.
"""

import os
import sys
import json
from flask import Flask, render_template, request, jsonify, send_from_directory
from urllib.parse import urlparse

# Configuration
PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
AUTO_OPEN_BROWSER = True

app = Flask(__name__, static_url_path='', static_folder='public')

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/tasks')
def tasks():
    return render_template('tasks.html')

@app.route('/memory')
def memory():
    return render_template('memory.html')

@app.route('/public/<path:path>')
def send_public(path):
    return send_from_directory('public', path)

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message', '')
    
    # ここでAIの処理を行いますが、現在はエコーバックしています
    response = {
        'text': f"あなたの質問に対する回答: {message}",
        'sources': []
    }
    
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True, port=5000)