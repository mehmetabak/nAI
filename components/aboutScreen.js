import './aboutScreen.css';

export function createAboutScreen() {
    return `
        <div id="about-screen">
            <div class="about-screen-close" id="about-screen-close">×</div>
            <div class="about-content">
                <h3>Project nAI</h3>
                <h4>nAI Project: Exploring Open Source Fine-Tuned AI Models</h4>
                <p>Welcome to Project nAI! Our mission is to bridge the gap between closed-source models using prompts and open-source models, facilitating their educational use. We curate a collection of effective prompts and fine-tuned models in a single platform. Contributors are encouraged to add models via JSON configuration. Currently, we feature prompts for Bison, Gemini, and GPT models, with plans for continuous expansion(Claude, Llama etc.). Please note that the project is in its early stages, leveraging Vite for a basic UI, ensuring it can be easily run locally by anyone interested.</p>
                <h4>About</h4>
                <p>Project nAI started with the goal of exploring and integrating fine-tuned versions of Gemini, GPT, and open-source models, fostering experimentation and learning within the AI community. Our platform supports developers and researchers in testing these models, promoting transparency, and fostering collaboration.</p>
            </div>
        </div>
    `;
}
