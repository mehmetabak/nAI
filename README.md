# Project nAI

A sleek, multi-model chat interface designed to explore, compare, and interact with various AI APIs in a persistent and user-friendly environment.

## About The Project

Project nAI has evolved from a simple concept into a modern, responsive web application for interacting with multiple large language models. Built with **Vite, React, Tailwind CSS, and Framer Motion**, it provides a fluid and intuitive user experience.

The core mission remains: to offer a platform for testing, comparing, and learning from different AI models. Users can seamlessly switch between models like **Google's Gemini** and **Llama 3 (via Groq)**, with each conversation retaining its own context and history. All chat sessions are saved locally in your browser, so your conversations are waiting for you when you return.

## Key Features

-   **Multi-Model Support:** Easily configure and switch between different AI models via a simple `models.json` file.
-   **Persistent Chat Sessions:** Conversations are automatically saved to your browser's `localStorage` and are loaded when you reopen the app.
-   **Dynamic & Modern UI:** A clean interface built with Tailwind CSS and enhanced with smooth animations from Framer Motion.
-   **Responsive Design:** A great user experience on both desktop and mobile devices, thanks to a collapsible sidebar and adaptive layout.
-   **Per-Chat Model Memory:** The application remembers which model was used for each conversation and automatically selects it when you switch back.
-   **Intuitive Chat Management:** Easily create, rename, and delete chat sessions. Empty chats are automatically cleaned up to keep your history tidy.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

You need [Node.js](https://nodejs.org/) (which includes npm) installed on your system.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/memoli0/project-ai.git
    ```
2.  **Navigate to the project directory:**
    ```sh
    cd project-ai
    ```
3.  **Install NPM packages:**
    ```sh
    npm install
    ```
4.  **Set up your API Keys:**
    Create a `.env` file in the root of the project and add your API keys.
    ```env
    # Get your key from Google AI Studio
    VITE_API_KEY_Gemini="YOUR_GEMINI_API_KEY"

    # This key is also from Google (legacy PaLM/Bison models)
    VITE_API_KEY_Text_Bison="YOUR_BISON_API_KEY"

    # Get your free key from console.groq.com
    VITE_API_KEY_Llama="YOUR_GROQ_API_KEY"
    ```
5.  **Start the development server:**
    ```sh
    npm run dev
    ```
6.  Open your browser and navigate to `http://localhost:5173` (or the address shown in your terminal).

## How to Contribute

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1.  Fork the Project.
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3.  Make your changes. Some ideas:
    *   Add a new model to `public/models.json`.
    *   Improve the UI/UX.
    *   Fix a bug or add a new feature.
4.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
5.  Push to the Branch (`git push origin feature/AmazingFeature`).
6.  Open a Pull Request.

## Branching Strategy

> ### `main` (This Branch)
> The [`main`](https://github.com/memoli0/nAI/tree/main) branch contains the core functionality of Project nAI, including a curated selection of models and prompts aimed at showcasing the capabilities of closed-source AI models. It serves as a promotional platform where users can explore various APIs and projects related to AI for educational purposes. You can access this branch to discover and test selected models easily.

> ### `community-contributed`
> The [`community-contributed`](https://github.com/memoli0/nAI/tree/community-contributed) branch hosts a wide range of models contributed by our community. These models are diverse in functionality and are suitable for a variety of tasks. This branch emphasizes community involvement and welcomes contributions from developers worldwide. You can clone this branch to explore and test locally contributed models, fostering collaborative learning and experimentation.

## Contact

Mehmet Abak - [@memoli](https://twitter.com/memoli) - mehmetabak@proton.me

Project Link: [https://github.com/memoli0/project-ai](https://github.com/memoli0/project-ai)

## License
This project is licensed under the [MIT License](LICENSE).