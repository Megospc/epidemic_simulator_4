document.head.innerHTML = `  <style>
    h1, h3, p {
      font-family: Monospace, sans-serif;
    }
    .fact {
      margin: 0.3em;
    }
    .factname {
      color: #000000;
    }
  </style>
  <title>Симулятор Эпидемии 4 — ${name}</title>`;
document.body.innerHTML = `  <h1 style="color: ${color};">${name}</h1>
  <h3>Краткое описание</h3>
  <p>${short}</p>
  <h3>Подробности</h3>
  <p>${long}</p>
  <h3>Факты</h3>
  <p class="fact" style="color: ${color};"><b class="factname">Цвет: </b>${color}</p>
  <p class="fact"><b class="factname">Индекс: </b>${index}</p>
  <p class="fact"><b class="factname">С версии: </b>${version}</p>
  <p class="fact"><b class="factname">Автор: </b>${author}</p>
  <p class="fact"><b class="factname">Дополнение: </b>${extension}</p>`;
for (let i = 0; i < facts.length; i++) document.body.innerHTML += `  <p class="fact">` + facts[i] + `</p>`;