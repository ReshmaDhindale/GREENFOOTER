document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('inputForm');
  const output = document.getElementById('output');
  const memberForm = document.getElementById("memberForm");
  const memberList = document.getElementById("memberList");
  const leaderboardList = document.getElementById("leaderboardList");
  const reportChart = document.getElementById("reportChart");

  const loadMembers = () => {
    const members = JSON.parse(localStorage.getItem("members")) || [];
    if (memberList) {
      memberList.innerHTML = '';
      members.forEach(m => {
        const li = document.createElement("li");
        li.textContent = `${m.name} (Age ${m.age})`;
        memberList.appendChild(li);
      });
    }
  };

  if (memberForm) {
    memberForm.addEventListener("submit", e => {
      e.preventDefault();
      const name = document.getElementById("memberName").value;
      const age = document.getElementById("memberAge").value;

      const members = JSON.parse(localStorage.getItem("members")) || [];
      members.push({ name, age });
      localStorage.setItem("members", JSON.stringify(members));
      loadMembers();
      e.target.reset();
    });

    loadMembers();
  }

  const getBadge = score => {
    if (score >= 1000) return "🥇";
    if (score >= 700) return "🥈";
    if (score >= 500) return "🥉";
    return "";
  };

  const loadLeaderboard = () => {
    const emissions = JSON.parse(localStorage.getItem("emissions")) || [];
    let leaderboard = [];
    const currentUser = localStorage.getItem("rememberedUser") || "Your Family";
    const userMap = {};

    emissions.forEach(e => {
      const user = e.user || currentUser;
      if (!userMap[user]) userMap[user] = 0;
      const reductionBonus = Math.max(0, 1000 - e.total);
      userMap[user] += reductionBonus;
    });

    for (const user in userMap) {
      leaderboard.push({ family: user, score: userMap[user] });
    }

    if (leaderboardList) {
      leaderboardList.innerHTML = leaderboard
        .sort((a, b) => b.score - a.score)
        .map((fam, i) => `<li>#${i + 1} - ${fam.family}: ${fam.score.toFixed(0)} pts</li>`)
        .join('');
    }
  };

  if (leaderboardList) loadLeaderboard();

  const showRecommendations = (elec, fuel, waste, water, transport) => {
    const recList = document.getElementById("recommendationsList");
    if (!recList) return;

    const tips = [];
    if (elec > 300) tips.push("💡 Switch to LED lights and unplug unused devices.");
    if (fuel > 50) tips.push("🚗 Carpool or use public transport to save fuel.");
    if (waste > 50) tips.push("♻️ Try composting and recycling to cut down waste.");
    if (water > 5000) tips.push("🚿 Install low-flow fixtures to conserve water.");
    if (transport > 200) tips.push("🚴 Use a bicycle or walk for short distances.");

    recList.innerHTML = tips.length
      ? tips.map(t => `<li>${t}</li>`).join('')
      : "<li>✅ You're doing great! Keep it up!</li>";
  };

  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();

      const elec = +document.getElementById("electricity").value;
      const fuel = +document.getElementById("fuel").value;
      const waste = +document.getElementById("waste").value;
      const water = +document.getElementById("water").value;
      const transport = +document.getElementById("transport").value;

      const emission = (elec * 0.4) + (fuel * 2.3) + (waste * 0.8) + (water * 0.001) + (transport * 0.21);
      if (output) output.textContent = `Estimated Carbon Emission: ${emission.toFixed(2)} kg/month`;

      const history = JSON.parse(localStorage.getItem("emissions")) || [];
      history.push({ total: emission, date: new Date().toISOString(), user: localStorage.getItem("rememberedUser") });
      localStorage.setItem("emissions", JSON.stringify(history));

      loadLeaderboard();
      showRecommendations(elec, fuel, waste, water, transport);

      if (emission > 1000) {
        alert("⚠️ High carbon footprint detected! Please review the recommendations.");
      }

      const alertBox = document.getElementById("alertBox");
      if (emission > 1000 && alertBox) {
        alertBox.style.display = "block";
      } else if (alertBox) {
        alertBox.style.display = "none";
      }
    });
  }

  if (reportChart) {
    const history = JSON.parse(localStorage.getItem("emissions")) || [];
    const labels = history.map((e, i) => `Entry ${i + 1}`);
    const data = history.map(e => e.total);

    new Chart(reportChart, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'CO₂ Emissions (kg)',
          data,
          borderColor: '#2f855a',
          backgroundColor: 'rgba(47, 133, 90, 0.1)',
          fill: true
        }]
      }
    });

    if (history.length > 0) {
      const scores = history.map(e => e.total);
      const highScoreElem = document.getElementById("highScore");
      const lowEmissionElem = document.getElementById("lowEmission");
      if (highScoreElem) highScoreElem.textContent = `${Math.max(...scores).toFixed(2)} kg`;
      if (lowEmissionElem) lowEmissionElem.textContent = `${Math.min(...scores).toFixed(2)} kg`;
    }
  }
});

// Intersection observer for animation

document.addEventListener("DOMContentLoaded", () => {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".animated-section").forEach(section => {
    observer.observe(section);
  });
});