const CONFIG_PATH = "config.json";
const MANIFEST_PATH = "image-manifest.json";

const imageElement = document.getElementById("question-image");
const placeholderElement = document.getElementById("image-placeholder");
const answerInput = document.getElementById("answer-input");
const answerForm = document.getElementById("answer-form");
const submitButton = document.getElementById("submit-button");
const nextButton = document.getElementById("next-button");
const feedbackElement = document.getElementById("feedback");
const questionCountElement = document.getElementById("question-count");
const scoreCountElement = document.getElementById("score-count");
const statusElement = document.getElementById("status");

let speciesPool = [];
let currentQuestion = null;
let score = 0;
let totalQuestions = 0;

function chooseRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function updateScoreDisplay() {
  questionCountElement.textContent = `Questions: ${totalQuestions}`;
  scoreCountElement.textContent = `Score: ${score}`;
}

function setFeedback(message, resultClass = "") {
  feedbackElement.textContent = message;
  feedbackElement.className = `feedback ${resultClass}`.trim();
}

function makeSpeciesPool(config, manifest) {
  const result = [];
  const categories = config.categories;

  if (!categories || typeof categories !== "object") {
    throw new Error("config.json must contain a 'categories' object.");
  }

  for (const [categoryName, speciesData] of Object.entries(categories)) {
    const categoryManifest = manifest[categoryName] || {};

    for (const [folderName, speciesInfo] of Object.entries(speciesData)) {
      const imagePaths = categoryManifest[folderName] || [];

      if (!speciesInfo.name || imagePaths.length === 0) {
        continue;
      }

      result.push({
        category: categoryName,
        name: speciesInfo.name,
        images: imagePaths
      });
    }
  }

  return result;
}

function showNextQuestion() {
  currentQuestion = chooseRandom(speciesPool);
  const imagePath = chooseRandom(currentQuestion.images);

  imageElement.hidden = true;
  placeholderElement.hidden = false;
  placeholderElement.textContent = "Loading image…";

  imageElement.onload = () => {
    placeholderElement.hidden = true;
    imageElement.hidden = false;
  };

  imageElement.onerror = () => {
    imageElement.hidden = true;
    placeholderElement.hidden = false;
    placeholderElement.textContent =
      `Could not load image: ${imagePath}. Check the image folder and manifest.`;
  };

  imageElement.src = imagePath;

  answerInput.value = "";
  answerInput.disabled = false;
  submitButton.disabled = false;
  nextButton.disabled = true;
  setFeedback("");
  answerInput.focus();
}

answerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!currentQuestion || submitButton.disabled) {
    return;
  }

  const playerAnswer = answerInput.value.trim();

  if (!playerAnswer) {
    setFeedback("Đừng bỏ trống.", "incorrect");
    answerInput.focus();
    return;
  }

  totalQuestions += 1;

  if (playerAnswer === currentQuestion.name) {
    score += 1;
    setFeedback("Đúng rồi!", "correct");
  } else {
    setFeedback(`Sai rồi, đây là: ${currentQuestion.name}`, "incorrect");
  }

  updateScoreDisplay();
  answerInput.disabled = true;
  submitButton.disabled = true;
  nextButton.disabled = false;
  nextButton.focus();
});

nextButton.addEventListener("click", showNextQuestion);

async function startQuiz() {
  try {
    statusElement.textContent = "Loading question database…";

    const [configResponse, manifestResponse] = await Promise.all([
      fetch(CONFIG_PATH),
      fetch(MANIFEST_PATH)
    ]);

    if (!configResponse.ok) {
      throw new Error(`Could not load config.json (HTTP ${configResponse.status}).`);
    }

    if (!manifestResponse.ok) {
      throw new Error(
        `Could not load image-manifest.json (HTTP ${manifestResponse.status}).`
      );
    }

    const [config, manifest] = await Promise.all([
      configResponse.json(),
      manifestResponse.json()
    ]);

    speciesPool = makeSpeciesPool(config, manifest);

    if (speciesPool.length === 0) {
      throw new Error(
        "No usable species were found. Check config.json, image folders, and image-manifest.json."
      );
    }

    statusElement.textContent =
      `Có ${speciesPool.length} con, chọn ngẫu nhiên`;

    updateScoreDisplay();
    showNextQuestion();
  } catch (error) {
    console.error(error);
    statusElement.textContent = "Unable to start the quiz.";
    placeholderElement.textContent = error.message;
    setFeedback("Check the setup instructions and browser console for details.", "incorrect");
  }
}

startQuiz();
