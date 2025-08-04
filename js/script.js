document.addEventListener("DOMContentLoaded", () => {
  // Get all DOM elements
  const searchInput = document.getElementById("search");
  const searchBtn = document.getElementById("search-btn");
  const profileContainer = document.getElementById("profile-container");
  const errorContainer = document.getElementById("error-container");
  const avatar = document.getElementById("avatar");
  const nameElement = document.getElementById("name");
  const usernameElement = document.getElementById("username");
  const bioElement = document.getElementById("bio");
  const locationElement = document.getElementById("location");
  const joinedDateElement = document.getElementById("joined-date");
  const profileLink = document.getElementById("profile-link");
  const followers = document.getElementById("followers");
  const following = document.getElementById("following");
  const repos = document.getElementById("repos");
  const companyElement = document.getElementById("company");
  const blogElement = document.getElementById("blog");
  const reposContainer = document.getElementById("repos-container");
  const themeToggle = document.getElementById("theme-toggle");
  
  // Analytics elements
  const totalStarsElement = document.getElementById("total-stars");
  const totalCommitsElement = document.getElementById("total-commits");
  const totalPRsElement = document.getElementById("total-prs");
  const totalIssuesElement = document.getElementById("total-issues");

  // Initialize theme
  function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && !prefersLight)) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      themeToggle.classList.add('dark');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
      themeToggle.classList.remove('dark');
    }
  }

  // Theme toggle event
  themeToggle.addEventListener('click', () => {
    if (document.body.classList.contains('light-theme')) {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      themeToggle.classList.add('dark');
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
      themeToggle.classList.remove('dark');
    }
  });

  // Search functionality
  searchBtn.addEventListener("click", searchUser);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchUser();
  });

  async function searchUser() {
    const username = searchInput.value.trim();

    if (!username) {
      showError("Please enter a username");
      return;
    }

    try {
      // Reset UI
      profileContainer.classList.add("hidden");
      errorContainer.classList.add("hidden");

      const userResponse = await fetch(`https://api.github.com/users/${username}`);
      
      // Check if response is successful
      if (!userResponse.ok) {
        if (userResponse.status === 404) {
          throw new Error("User not found");
        } else if (userResponse.status === 403) {
          // Check if it's rate limit error
          const rateLimitResponse = await fetch('https://api.github.com/rate_limit');
          if (rateLimitResponse.ok) {
            const rateData = await rateLimitResponse.json();
            if (rateData.resources.core.remaining === 0) {
              const resetTime = new Date(rateData.resources.core.reset * 1000);
              // Format time in a more readable way
              const formattedTime = resetTime.toLocaleTimeString([], {
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true
              });
              const formattedDate = resetTime.toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              });
              throw new Error(`API rate limit exceeded. Try again at ${formattedTime} on ${formattedDate}`);
            }
          }
          throw new Error("Forbidden: Access denied");
        } else {
          throw new Error(`GitHub API error: ${userResponse.status}`);
        }
      }

      const userData = await userResponse.json();
      displayUserData(userData);
      
      // Fetch repositories
      await fetchRepositories(userData.repos_url);
      
      // Fetch analytics data
      await fetchAnalyticsData(username);

    } catch (error) {
      showError(error.message);
    }
  }

  async function fetchRepositories(reposUrl) {
    reposContainer.innerHTML = '<div class="loading-repos">Loading repositories...</div>';

    try {
      // Get repositories sorted by update date (newest first)
      const response = await fetch(reposUrl + "?sort=updated&direction=desc");
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Repositories not found");
        } else {
          throw new Error("Failed to load repositories");
        }
      }

      const repos = await response.json();
      
      // Take only the 10 most recent repositories
      const recentRepos = repos.slice(0, 10);
      displayRepos(recentRepos);
    } catch (error) {
      reposContainer.innerHTML = `<div class="no-repos">${error.message}</div>`;
    }
  }
  
async function fetchAnalyticsData(username) {
  try {
    // Reset analytics
    if (totalStarsElement) totalStarsElement.textContent = '0';
    if (totalCommitsElement) totalCommitsElement.textContent = '0';
    if (totalPRsElement) totalPRsElement.textContent = '0';
    if (totalIssuesElement) totalIssuesElement.textContent = '0';
    
    // Fetch all repositories for stars count
    const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`);
    if (!reposResponse.ok) {
      if (reposResponse.status === 404) return;
      throw new Error("Failed to load repositories");
    }
    
    const repos = await reposResponse.json();
    
    // Calculate total stars
    let totalStars = 0;
    repos.forEach(repo => {
      totalStars += repo.stargazers_count;
    });
    
    // Update stars count
    if (totalStarsElement) totalStarsElement.textContent = totalStars.toLocaleString();
    
    // Get dates for last year (only for commits)
    const now = new Date();
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    const lastYearISO = lastYear.toISOString().split('T')[0];
    
    // Fetch commits for the last year using search API
    const commitsResponse = await fetch(`https://api.github.com/search/commits?q=author:${username}+committer-date:>=${lastYearISO}`, {
      headers: {
        'Accept': 'application/vnd.github.cloak-preview'
      }
    });
    
    let totalCommits = 0;
    if (commitsResponse.ok) {
      const commitsData = await commitsResponse.json();
      totalCommits = commitsData.total_count;
    }
    if (totalCommitsElement) totalCommitsElement.textContent = totalCommits.toLocaleString();
    
    // FIXED: Accurate PR count for ALL TIME
    let totalPRs = 0;
    let prPage = 1;
    let hasMorePRs = true;
    
    while (hasMorePRs) {
      // Убрали фильтр по дате created:>=...
      const prsResponse = await fetch(
        `https://api.github.com/search/issues?q=author:${username}+type:pr&per_page=100&page=${prPage}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Profiles-Search-App'
          }
        }
      );
      
      if (prsResponse.ok) {
        const prsData = await prsResponse.json();
        totalPRs += prsData.items.length;
        
        // Check if we have more pages
        const linkHeader = prsResponse.headers.get('Link');
        hasMorePRs = linkHeader && linkHeader.includes('rel="next"');
        prPage++;
      } else {
        hasMorePRs = false;
        if (prsResponse.status !== 403) {
          console.error("PRs API error:", await prsResponse.json());
        }
      }
    }
    
    if (totalPRsElement) totalPRsElement.textContent = totalPRs.toLocaleString();
    
    // Fetch issues (keep last year filter if needed)
    const issuesResponse = await fetch(`https://api.github.com/search/issues?q=author:${username}+type:issue+created:>=${lastYearISO}`);
    let totalIssues = 0;
    if (issuesResponse.ok) {
      const issuesData = await issuesResponse.json();
      totalIssues = issuesData.total_count;
    }
    if (totalIssuesElement) totalIssuesElement.textContent = totalIssues.toLocaleString();
    
  } catch (error) {
    console.error("Analytics error:", error);
    // Show zeros if analytics fail
    if (totalCommitsElement) totalCommitsElement.textContent = '0';
    if (totalPRsElement) totalPRsElement.textContent = '0';
    if (totalIssuesElement) totalIssuesElement.textContent = '0';
  }
}

  function displayRepos(repos) {
    if (!repos || repos.length === 0) {
      reposContainer.innerHTML = '<div class="no-repos">No repositories found</div>';
      return;
    }

    reposContainer.innerHTML = "";

    repos.forEach((repo) => {
      const repoCard = document.createElement("div");
      repoCard.className = "repo-card";

      const updatedAt = formatDate(repo.updated_at);

      repoCard.innerHTML = `
        <a href="${repo.html_url}" target="_blank" class="repo-name">
          <i class="fas fa-code-branch"></i> ${repo.name}
        </a>
        <p class="repo-description">${repo.description || "No description available"}</p>
        <div class="repo-meta">
          ${
            repo.language
              ? `
            <div class="repo-meta-item">
              <i class="fas fa-circle" style="color: ${getLanguageColor(repo.language)}"></i> ${repo.language}
            </div>
          `
              : ""
          }
          <div class="repo-meta-item">
            <i class="fas fa-star"></i> ${repo.stargazers_count.toLocaleString()}
          </div>
          <div class="repo-meta-item">
            <i class="fas fa-code-fork"></i> ${repo.forks_count.toLocaleString()}
          </div>
          <div class="repo-meta-item">
            <i class="fas fa-history"></i> ${updatedAt}
          </div>
        </div>
      `;

      reposContainer.appendChild(repoCard);
    });
  }

  // Simple language color mapping
  function getLanguageColor(language) {
    const colors = {
      JavaScript: "#f1e05a",
      Python: "#3572A5",
      Java: "#b07219",
      TypeScript: "#3178c6",
      CSS: "#563d7c",
      HTML: "#e34c26",
      PHP: "#4F5D95",
      Ruby: "#701516",
      C: "#555555",
      "C++": "#f34b7d",
      Swift: "#ffac45",
      Go: "#00ADD8",
      Rust: "#dea584",
      Kotlin: "#F18E33",
      "C#": "#178600",
      Shell: "#89e051",
      "Objective-C": "#438eff",
      Scala: "#c22d40",
      Perl: "#0298c3",
      Lua: "#000080",
      Haskell: "#5e5086",
      Dart: "#00B4AB",
      PowerShell: "#012456",
      R: "#198CE7",
      MATLAB: "#e16737",
      Groovy: "#e69f56",
      Elixir: "#6e4a7e",
      Clojure: "#db5855",
      Erlang: "#B83998",
      Julia: "#a270ba",
      CoffeeScript: "#244776",
      TeX: "#3D6117",
      "Vim script": "#199f4b",
      Assembly: "#6E4C13",
      "Visual Basic": "#945db7",
      "F#": "#b845fc",
      OCaml: "#3be133",
      Delphi: "#b0ce4e",
      Scheme: "#1e4aec",
      D: "#ba595e",
      "Common Lisp": "#3fb68b",
      "Emacs Lisp": "#c065db",
      "Vue": "#41b883",
      "Angular": "#dd0031",
      "React": "#61dafb",
      "Svelte": "#ff3e00",
      "Solidity": "#AA6746",
      "Markdown": "#083fa1",
      "Dockerfile": "#384d54",
      "Makefile": "#427819",
      "Batchfile": "#C1F12E"
    };
    
    return colors[language] || "#4a7ca5";
  }

  function displayUserData(user) {
    if (avatar) avatar.src = user.avatar_url;
    if (nameElement) nameElement.textContent = user.name || user.login;
    if (usernameElement) usernameElement.textContent = `@${user.login}`;
    if (bioElement) bioElement.textContent = user.bio || "No bio available";
    if (locationElement) locationElement.textContent = user.location || "Not specified";
    if (joinedDateElement) joinedDateElement.textContent = formatDate(user.created_at);
    if (profileLink) profileLink.href = user.html_url;
    if (followers) followers.textContent = user.followers.toLocaleString();
    if (following) following.textContent = user.following.toLocaleString();
    if (repos) repos.textContent = user.public_repos.toLocaleString();
    
    if (companyElement) {
      companyElement.textContent = user.company || "Not specified";
    }
    
    if (blogElement) {
      if (user.blog) {
        blogElement.textContent = user.blog;
        blogElement.href = user.blog.startsWith("http") ? user.blog : `https://${user.blog}`;
      } else {
        blogElement.textContent = "No website";
        blogElement.href = "#";
      }
    }

    // Show the profile
    if (profileContainer) {
      profileContainer.classList.remove("hidden");
    }
  }

  function showError(message) {
    if (errorContainer) {
      // Handle "User not found" specifically
      if (message.includes("not found") || message.includes("404")) {
        errorContainer.querySelector('p').textContent = "User not found. Please try another username.";
      } 
      // Handle rate limit specifically
      else if (message.includes("rate limit")) {
        errorContainer.querySelector('p').textContent = message;
      }
      // Handle other errors
      else {
        errorContainer.querySelector('p').textContent = "An error occurred. Please try again later.";
      }
      
      errorContainer.classList.remove("hidden");
    }
    
    if (profileContainer) {
      profileContainer.classList.add("hidden");
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Initialize theme
  initTheme();
  
  // Set default user and search after everything is initialized
  if (searchInput) {
    searchInput.value = "capwan";
    // Use a slight delay to ensure all is set
    setTimeout(() => {
      searchUser();
    }, 100);
  }
});