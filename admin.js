const tokenInput = document.getElementById("admin-token");
const loadButton = document.getElementById("load-results");
const message = document.getElementById("admin-message");
const table = document.getElementById("results-table");
const tableBody = table.querySelector("tbody");

loadButton.addEventListener("click", loadResults);
async function loadResults() {
  message.textContent = "Loading results…";
  table.hidden = true;
  try {
    const response = await fetch("/api/admin/attempts", {headers: {"X-Admin-Token": tokenInput.value}});
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Unable to load results.");
    tableBody.replaceChildren(...body.attempts.map((attempt) => {
      const row = document.createElement("tr");
      const values = [new Date(attempt.completed_at).toLocaleString(), attempt.student_name,
        attempt.course, `${attempt.score}/${attempt.total_questions}`, `${attempt.percentage}%`,
        attempt.passed ? "Pass" : "Fail"];
      values.forEach((value) => { const cell = document.createElement("td"); cell.textContent = value; row.append(cell); });
      return row;
    }));
    message.textContent = `${body.attempts.length} attempt(s) found.`;
    table.hidden = false;
  } catch (error) { message.textContent = error.message; }
}
