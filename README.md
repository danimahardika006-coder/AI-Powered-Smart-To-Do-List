# 🤖 AI-Powered Smart To-Do List (IBM Capstone Project)

A modern, responsive web-based task management application integrated with an AI Agent to boost personal productivity. Built as a capstone project for the IBM course, this application goes beyond a standard to-do list by leveraging artificial intelligence for task decomposition, smart prioritization, contextual drafting, and daily performance coaching.

---

## ✨ Features

### 📋 Core Task Management (Front-End Essentials)
* **CRUD Operations:** Seamlessly add, edit, delete, and mark tasks as complete.
* **Smart Filtering & Categorization:** Filter tasks by status (*All, Active, Completed*) and custom categories (*Work, Study, Personal*).
* **Persistent Storage:** LocalStorage integration to ensure your tasks stay saved across browser sessions.
* **Theme Toggle:** Built-in Dark Mode and Light Mode support for comfortable viewing.

### 🧠 AI-Powered Agent Capabilities
1. **Smart Task Breakdown:** Automatically splits large or ambiguous tasks into 3–5 actionable sub-tasks with a single click.
2. **Priority & Time Estimator:** Analyzes task descriptions to recommend priority levels (*High, Medium, Low*) and estimates required completion time in minutes.
3. **Context-Aware Action Helper:** Generates instant drafts, outlines, or starter code templates right inside your tasks to help you overcome writer's block or procrastination.
4. **Daily Productivity Coach:** Evaluates daily completed vs. pending tasks, providing an AI productivity score and actionable tips for tomorrow.

---

## 🛠️ Tech Stack

* **HTML5:** Semantic document structure and modal containers.
* **CSS3 (Vanilla):** Modern styling, CSS Variables for theming, Flexbox/Grid layouts, and glassmorphism UI touches.
* **JavaScript (ES6 Modules):** Modular architecture handling state management, DOM manipulation, and API integration.
* **AI Integration:** Fetch API interfacing with LLMs (Gemini / OpenAI / Groq) parsing strict JSON outputs.

---

## 📁 Project Architecture

```text
ai-todo-app/
├── index.html          # Main UI structure, forms, task lists, and modals
├── css/
│   ├── style.css       # Core layout, variables, and global styles
│   └── components.css  # Specific UI components (cards, badges, loaders, modals)
├── js/
│   ├── app.js          # Main entry point (State management & DOM binding)
│   ├── storage.js      # LocalStorage utility module for data persistence
│   └── ai-agent.js     # AI service module managing prompts and API fetching
├── config.js           # API keys and endpoint configuration
└── README.md           # Project documentation and setup guide
