import "./style.css";
const app: HTMLDivElement = document.querySelector("#app")!;

const button = document.createElement("button");

button.textContent = "Click me!";

button.addEventListener("click", () => {
  alert("you clicked the button!");
});

app.append(button);
