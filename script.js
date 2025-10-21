document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ★★★ PRE-LOADED SEASON DATA ★★★ ---
    // This is the correct data as of Oct 21, 2025 (after Round 19, US GP).
    // You can manually edit this data as the season progresses.

    const SEASON_CONFIG = {
        totalRaces: 24,
        completedGPs: 19,     // 19 of 24 GPs are done
        completedSprints: 4,  // 4 of 6 Sprints are done (China, Miami, Belgium, USA)
        totalSprints: 6
    };

    // CORRECT 2025 DRIVER STANDINGS (after US GP, Round 19)
    const DEFAULT_DRIVERS = [
        { name: '🇦🇺 Oscar Piastri', points: 346 },
        { name: '🇬🇧 Lando Norris', points: 332 },
        { name: '🇳🇱 Max Verstappen', points: 306 },
        { name: '🇬🇧 George Russell', points: 252 },
        { name: '🇲🇨 Charles Leclerc', points: 192 },
        { name: '🇬🇧 Lewis Hamilton', points: 142 },
        { name: '🇮🇹 Kimi Antonelli', points: 89 },
        { name: '🇹🇭 Alex Albon', points: 73 },
        { name: '🇩🇪 Nico Hülkenberg', points: 41 },
        { name: '🇫🇷 Isack Hadjar', points: 39 },
        { name: '🇪🇸 Carlos Sainz', points: 38 },
        { name: '🇪🇸 Fernando Alonso', points: 37 },
        { name: '🇨🇦 Lance Stroll', points: 32 },
        { name: '🇳🇿 Liam Lawson', points: 30 },
        { name: '🇫🇷 Esteban Ocon', points: 28 },
        { name: '🇯🇵 Yuki Tsunoda', points: 28 },
        { name: '🇫🇷 Pierre Gasly', points: 20 },
        { name: '🇬🇧 Oliver Bearman', points: 20 },
        { name: '🇧🇷 Gabriel Bortoleto', points: 18 },
        { name: '🇦🇷 Franco Colapinto', points: 0 }
    ];

    // --- 2. POINT SYSTEMS ---
    const gpPointsMap = { "1": 25, "2": 18, "3": 15, "4": 12, "5": 10, "6": 8, "7": 6, "8": 4, "9": 2, "10": 1 };
    const sprintPointsMap = { "1": 8, "2": 7, "3": 6, "4": 5, "5": 4, "6": 3, "7": 2, "8": 1 };

    // --- 3. GLOBAL VARIABLES ---
    let drivers = [];
    let seasonStatus = {};
    let currentRaceMode = 'GP'; // 'GP' or 'SPRINT'

    // --- 4. GET HTML ELEMENTS ---
    const standingsBody = document.getElementById('standings-body');
    const resetBtn = document.getElementById('reset-btn');
    // Modal elements
    const modal = document.getElementById('race-modal');
    const modalTitle = document.getElementById('modal-title');
    const showModalBtn = document.getElementById('show-race-modal-btn');
    const showSprintModalBtn = document.getElementById('show-sprint-modal-btn');
    const cancelRaceBtn = document.getElementById('cancel-race-btn');
    const submitRaceBtn = document.getElementById('submit-race-btn');
    const raceNameInput = document.getElementById('race-name-input');
    const raceFormDrivers = document.getElementById('race-form-drivers');
    // Status display elements
    const totalRacesEl = document.getElementById('total-races');
    const completedRacesEl = document.getElementById('completed-races');
    const remainingRacesEl = document.getElementById('remaining-races');
    const maxPointsLeftEl = document.getElementById('max-points-left');

    // --- 5. CORE FUNCTIONS ---

    /**
     * Loads data from localStorage or uses the DEFAULT data.
     */
    function loadData() {
        const savedDrivers = localStorage.getItem('gpSimDrivers');
        const savedStatus = localStorage.getItem('gpSimStatus');

        if (savedDrivers && savedStatus) {
            drivers = JSON.parse(savedDrivers);
            seasonStatus = JSON.parse(savedStatus);
        } else {
            // Load the default snapshot
            resetAll(true); // 'true' for silent reset
        }
    }

    /**
     * Saves the current driver and season state to localStorage.
     */
    function saveData() {
        localStorage.setItem('gpSimDrivers', JSON.stringify(drivers));
        localStorage.setItem('gpSimStatus', JSON.stringify(seasonStatus));
    }

    /**
     * Resets the entire simulation back to the pre-loaded snapshot.
     */
    function resetAll(silent = false) {
        const confirmed = silent || confirm("Are you sure you want to reset all simulated results and return to the season snapshot?");
        if (confirmed) {
            // Deep copy the default data to prevent modification
            drivers = JSON.parse(JSON.stringify(DEFAULT_DRIVERS));
            seasonStatus = JSON.parse(JSON.stringify(SEASON_CONFIG));
            saveData();
            updateAll();
        }
    }

    /**
     * Calculates the maximum points remaining in the season.
     */
    function calculateMaxPointsRemaining() {
        const remainingGPs = seasonStatus.totalRaces - seasonStatus.completedGPs;
        const remainingSprints = seasonStatus.totalSprints - seasonStatus.completedSprints;

        // Use 26 for GP (25 win + 1 FL) for the safest "max" calculation
        const gpPoints = remainingGPs * 26; 
        const sprintPoints = remainingSprints * 8;

        return gpPoints + sprintPoints;
    }

    /**
     * Updates all displays: Status grid and Standings table.
     */
    function updateAll() {
        renderStandings();
        renderStatus();
    }

    /**
     * Redraws the Season Status grid.
     */
    function renderStatus() {
        const totalCompleted = seasonStatus.completedGPs;
        const totalRemaining = seasonStatus.totalRaces - totalCompleted;
        const maxPoints = calculateMaxPointsRemaining();

        totalRacesEl.textContent = seasonStatus.totalRaces;
        completedRacesEl.textContent = totalCompleted;
        remainingRacesEl.textContent = totalRemaining;
        maxPointsLeftEl.textContent = maxPoints;

        // Disable buttons if season is over
        const sprintsLeft = seasonStatus.totalSprints - seasonStatus.completedSprints;
        showModalBtn.disabled = totalRemaining <= 0;
        showSprintModalBtn.disabled = sprintsLeft <= 0;

        if (totalRemaining <= 0) {
            showModalBtn.title = "Season finished";
            showModalBtn.classList.add('disabled');
        }
        if (sprintsLeft <= 0) {
            showSprintModalBtn.title = "All Sprints finished";
            showSprintModalBtn.classList.add('disabled');
        }
    }

    /**
     * Redraws the main standings table, including clinch logic.
     */
    function renderStandings() {
        standingsBody.innerHTML = ""; // Clear table
        
        const sortedDrivers = [...drivers].sort((a, b) => b.points - a.points);
        const maxPointsRemaining = calculateMaxPointsRemaining();
        const leaderPoints = sortedDrivers[0].points;
        let championClinched = false;

        sortedDrivers.forEach((driver, index) => {
            const row = document.createElement('tr');
            const pos = index + 1;
            
            // Clinch Logic
            let status = 'in-contention';
            let statusText = 'In Contention';
            
            // Check if this driver *has* clinched
            if (index === 0 && maxPointsRemaining < (leaderPoints - (sortedDrivers[1]?.points || 0))) {
                status = 'clinched';
                statusText = '🏆 CLINCHED';
                championClinched = true;
            } 
            // Check if this driver is *eliminated*
            else if (driver.points + maxPointsRemaining < leaderPoints) {
                status = 'eliminated';
                statusText = 'Eliminated';
            } 
            // If champ is clinched but this isn't the champ, they are eliminated
            else if (championClinched && index > 0) {
                 status = 'eliminated';
                 statusText = 'Eliminated';
            }
            
            row.innerHTML = `
                <td>${pos}</td>
                <td>${driver.name}</td>
                <td>${driver.points}</td>
                <td><span class="clinch-status ${status}">${statusText}</span></td>
            `;
            standingsBody.appendChild(row);
        });
    }

    // --- 6. MODAL & RACE LOGIC ---

    function openRaceModal(mode) {
        currentRaceMode = mode;
        raceFormDrivers.innerHTML = "";
        raceNameInput.value = "";
        
        let activePointsMap, maxPointsPos, title;
        
        if (mode === 'GP') {
            title = "Log Grand Prix Results";
            activePointsMap = gpPointsMap;
            maxPointsPos = 10;
        } else {
            title = "Log Sprint Race Results";
            activePointsMap = sprintPointsMap;
            maxPointsPos = 8;
        }
        modalTitle.textContent = title;

        drivers.forEach(driver => {
            const row = document.createElement('div');
            row.className = 'driver-race-row';
            row.innerHTML = `
                <label for="pos-${driver.name}">${driver.name}</label>
                <select id="pos-${driver.name}" data-driver-name="${driver.name}">
                    ${generatePositionOptions(activePointsMap, maxPointsPos)}
                </select>
            `;
            raceFormDrivers.appendChild(row);
        });

        modal.style.display = "flex";
    }
    
    function generatePositionOptions(pointsMap, maxPos) {
        let options = `<option value="0">P${maxPos + 1}+ / DNF</option>`;
        for (let i = 1; i <= maxPos; i++) {
            options += `<option value="${i}">P${i} (${pointsMap[i]} pts)</option>`;
        }
        for (let i = maxPos + 1; i <= 20; i++) {
            options += `<option value="0">P${i}</option>`;
        }
        return options;
    }

    function closeRaceModal() {
        modal.style.display = "none";
    }

    function submitRace() {
        const selects = raceFormDrivers.querySelectorAll('select');
        let awardedPositions = {};
        const activePointsMap = (currentRaceMode === 'GP') ? gpPointsMap : sprintPointsMap;

        // Validate for duplicates
        for (const select of selects) {
            const position = select.value;
            if (position !== "0") {
                if (awardedPositions[position]) {
                    alert(`Error: Two drivers are listed for P${position}. Please fix.`);
                    return;
                }
                awardedPositions[position] = true;
            }
        }
        
        // Process points
        selects.forEach(select => {
            const driverName = select.dataset.driverName;
            const position = select.value;
            const driver = drivers.find(d => d.name === driverName);
            if (driver) {
                driver.points += activePointsMap[position] || 0;
            }
        });
        
        // Update season status
        if (currentRaceMode === 'GP') {
            seasonStatus.completedGPs++;
        } else {
            seasonStatus.completedSprints++;
        }
        
        alert("Race results have been logged! Standings and season status updated.");
        
        closeRaceModal();
        saveData();
        updateAll();
    }

    // --- 7. EVENT LISTENERS ---
    resetBtn.addEventListener('click', () => resetAll(false));
    showModalBtn.addEventListener('click', () => openRaceModal('GP'));
    showSprintModalBtn.addEventListener('click', () => openRaceModal('SPRINT'));
    cancelRaceBtn.addEventListener('click', closeRaceModal);
    submitRaceBtn.addEventListener('click', submitRace);
    window.addEventListener('click', (event) => {
        if (event.target === modal) closeRaceModal();
    });

    // --- 8. INITIALIZE THE PAGE ---
    loadData();
    updateAll(); // Load, render standings, and render status
});