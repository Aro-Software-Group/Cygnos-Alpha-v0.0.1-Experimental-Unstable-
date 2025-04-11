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

@app.route('/api/tasks', methods=['GET', 'POST'])
def api_tasks():
    if request.method == 'GET':
        # Return a list of tasks (dummy data for now)
        tasks = [
            {'id': 1, 'title': 'Task 1', 'status': 'in-progress'},
            {'id': 2, 'title': 'Task 2', 'status': 'completed'}
        ]
        return jsonify(tasks)
    elif request.method == 'POST':
        # Create a new task (dummy implementation for now)
        data = request.json
        new_task = {
            'id': data.get('id', 3),
            'title': data.get('title', 'New Task'),
            'status': data.get('status', 'pending')
        }
        return jsonify(new_task), 201

@app.route('/api/memory', methods=['GET', 'POST'])
def api_memory():
    if request.method == 'GET':
        # Return a list of memory items (dummy data for now)
        memory_items = [
            {'id': 1, 'content': 'Memory item 1'},
            {'id': 2, 'content': 'Memory item 2'}
        ]
        return jsonify(memory_items)
    elif request.method == 'POST':
        # Create a new memory item (dummy implementation for now)
        data = request.json
        new_memory_item = {
            'id': data.get('id', 3),
            'content': data.get('content', 'New Memory Item')
        }
        return jsonify(new_memory_item), 201

if __name__ == '__main__':
    app.run(debug=True, port=5000)
