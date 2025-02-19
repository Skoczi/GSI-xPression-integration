document.addEventListener("DOMContentLoaded", function() {
    const roundElement = document.getElementById("round");
    const timeElement = document.getElementById("time");
    const toggleButton = document.getElementById("toggleButton");

    function updateData() {
        fetch("/state")
            .then(response => response.json())
            .then(data => {
                roundElement.textContent = data.round;
                timeElement.textContent = data.timeRemaining;
                toggleButton.textContent = data.allowCommands ? "Pause" : "Run";
            });
    }

    toggleButton.addEventListener("click", function() {
        fetch("/toggle", { method: "POST" })
            .then(response => response.json())
            .then(data => {
                toggleButton.textContent = data.allowCommands ? "Pause" : "Run";
            });
    });

    setInterval(updateData, 1000);
});
