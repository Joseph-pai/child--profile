document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Elements ---
    const navButtons = document.querySelectorAll('nav button');
    const tabContents = document.querySelectorAll('.tab-content');
    const saveDataButton = document.getElementById('saveData');
    const childNameInput = document.getElementById('childName');
    const profileChildNameHeader = document.getElementById('profileChildNameHeader');
    const addGradeForm = document.getElementById('addGradeForm');
    const gradeRecordsListDiv = document.getElementById('gradeRecordsList');
    const gradeAnalysisTextDiv = document.getElementById('gradeAnalysisText');
    const deleteLastGradeButton = document.getElementById('deleteLastGrade');

    // --- Chart Instances ---
    let subjectAnalysisChartInstance;
    let valuesDevelopmentChartInstance;
    let gradesCurveChartInstance;

    // --- Profile Data Structure ---
    let profileData = {
        basicInfo: { name: "孩子", nickname: "", ageGrade: "", favoriteVerse: "" },
        academic: {
            grades: [], // Array to store individual grade objects
            subjectAnalysis: { "语文": 70, "数学": 70, "英语": 70, "科学": 70, "社会": 70 }, // Default radar data
            teacherSuggestions: ""
        },
        lifeCharacter: {
            habitsLog: "",
            valuesDevelopment: { "爱": 3, "喜乐": 3, "和平": 3, "忍耐": 3, "恩慈": 3, "良善": 3 }, // Default radar data
            selfWorth: ""
        },
        faithJourney: {
            introduction: "",
            relationshipWithGod: "",
            faithInAction: "",
            towardsBaptism: { preparationNotes: "", decisionDate: "", baptismDate: "" }
        },
        goalsReflection: { goals: "", reflections: "" },
        milestones: { memories: "" }
    };

    // --- Navigation ---
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            navButtons.forEach(btn => btn.classList.remove('active-nav'));
            button.classList.add('active-nav');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetId) {
                    content.classList.add('active');
                }
            });
        });
    });

    // --- Data Storage ---
    function getNestedProperty(obj, path) {
        if (!path) return obj;
        const properties = path.split('.');
        return properties.reduce((prev, curr) => (prev && prev[curr] !== undefined) ? prev[curr] : null, obj);
    }

    function setNestedProperty(obj, path, value) {
        if (!path) return;
        const properties = path.split('.');
        let current = obj;
        for (let i = 0; i < properties.length - 1; i++) {
            // Create nested object if it doesn't exist
            if (!current[properties[i]] || typeof current[properties[i]] !== 'object') {
                current[properties[i]] = {};
            }
            current = current[properties[i]];
        }
        // Only set if current is still an object (path was valid)
         if (typeof current === 'object' && current !== null) {
            current[properties[properties.length - 1]] = value;
         } else {
            console.error("Failed to set nested property for path:", path);
         }
    }

    function saveProfileData() {
        // Collect data from [data-field] inputs/textareas
        document.querySelectorAll('[data-field]').forEach(input => {
            const path = input.getAttribute('data-field');
            setNestedProperty(profileData, path, input.value);
        });

        // Collect data from radar inputs (using labels as keys now)
        document.querySelectorAll('input[data-radar]').forEach(input => {
            const radarType = input.getAttribute('data-radar');
            const label = input.getAttribute('data-radar-label'); // Use the label directly

            if (radarType === 'subjectAnalysis') {
                 if (!profileData.academic[radarType]) profileData.academic[radarType] = {}; // Ensure object exists
                profileData.academic[radarType][label] = parseInt(input.value) || 0;
            } else if (radarType === 'valuesDevelopment') {
                 if (!profileData.lifeCharacter[radarType]) profileData.lifeCharacter[radarType] = {}; // Ensure object exists
                profileData.lifeCharacter[radarType][label] = parseInt(input.value) || 0;
            }
        });
        
        // Note: profileData.academic.grades is updated directly via addGrade/deleteGrade functions
        
        try {
            localStorage.setItem('childProfileData', JSON.stringify(profileData));
            alert('数据已保存到本地！');
        } catch (e) {
             console.error("Error saving to localStorage:", e);
             alert("保存失败！可能是本地存储空间已满。");
        }

        updateProfileNameHeader();
        updateRecentHighlights(); // Consider adding academic highlights
    }

    function loadProfileData() {
        const storedData = localStorage.getItem('childProfileData');
        if (storedData) {
            try {
                profileData = JSON.parse(storedData);
                
                // --- Crucial: Initialize missing nested structures if loading older data ---
                 profileData.academic = profileData.academic || {};
                 profileData.academic.grades = profileData.academic.grades || []; // Ensure grades array exists
                 profileData.academic.subjectAnalysis = profileData.academic.subjectAnalysis || {};
                 profileData.lifeCharacter = profileData.lifeCharacter || {};
                 profileData.lifeCharacter.valuesDevelopment = profileData.lifeCharacter.valuesDevelopment || {};
                 profileData.faithJourney = profileData.faithJourney || {};
                 profileData.faithJourney.towardsBaptism = profileData.faithJourney.towardsBaptism || {};
                 profileData.goalsReflection = profileData.goalsReflection || {};
                 profileData.milestones = profileData.milestones || {};
                 profileData.basicInfo = profileData.basicInfo || {};


                // Populate [data-field] inputs/textareas
                document.querySelectorAll('[data-field]').forEach(input => {
                    const path = input.getAttribute('data-field');
                    const value = getNestedProperty(profileData, path);
                    if (value !== null && value !== undefined) {
                        input.value = value;
                    } else {
                         input.value = ''; // Clear field if no data found for path
                    }
                });

                // Populate radar inputs
                document.querySelectorAll('input[data-radar]').forEach(input => {
                    const radarType = input.getAttribute('data-radar');
                    const label = input.getAttribute('data-radar-label'); // Use label directly
                    let value;
                    if (radarType === 'subjectAnalysis' && profileData.academic[radarType]) {
                         value = profileData.academic[radarType][label];
                    } else if (radarType === 'valuesDevelopment' && profileData.lifeCharacter[radarType]) {
                         value = profileData.lifeCharacter[radarType][label];
                    }
                    // Set value or default if undefined
                    input.value = value !== undefined ? value : (radarType === 'subjectAnalysis' ? 70 : 3);
                });

                updateProfileNameHeader();
                updateRecentHighlights();
                displayGradeRecords(); // Display loaded grades
                initializeAllCharts(); // Initialize/update charts with loaded data
             } catch (e) {
                console.error("Error parsing stored data:", e);
                alert("加载本地数据时出错，可能数据已损坏。将使用默认数据。");
                initializeAllCharts(); // Initialize with defaults if load fails
            }
        } else {
            // No stored data, initialize charts with default data
            initializeAllCharts();
             displayGradeRecords(); // Show "暂无记录"
        }
    }

    saveDataButton.addEventListener('click', saveProfileData);

    function updateProfileNameHeader() {
        const name = profileData.basicInfo.name || "孩子";
        profileChildNameHeader.textContent = name;
        document.title = `${name}的个人成长档案`;
    }

    function updateRecentHighlights() {
        let highlights = [];
         const latestGrade = profileData.academic.grades && profileData.academic.grades.length > 0 
            ? profileData.academic.grades[profileData.academic.grades.length - 1] 
            : null;

        if (latestGrade) highlights.push(`最新成绩 (${latestGrade.subject} ${latestGrade.examName}): ${latestGrade.score}`);
        if (profileData.academic?.teacherSuggestions?.trim()) highlights.push("有新的老师建议。");
        if (profileData.goalsReflection?.reflections?.trim()) highlights.push("有新的成长反思。");
        if (profileData.faithJourney?.towardsBaptism?.baptismDate) highlights.push(`预计受洗日期: ${profileData.faithJourney.towardsBaptism.baptismDate}`);

        const previewEl = document.getElementById('recentHighlightsPreview');
        if (highlights.length > 0) {
            previewEl.innerHTML = "<ul>" + highlights.map(h => `<li>${h}</li>`).join("") + "</ul>";
        } else {
            previewEl.textContent = "（暂无近期亮点）";
        }
    }


    // --- Academic Grades Handling ---
    addGradeForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent default form submission

        const newGrade = {
            term: document.getElementById('gradeTerm').value.trim(),
            date: document.getElementById('gradeDate').value,
            subject: document.getElementById('gradeSubject').value.trim(),
            examName: document.getElementById('gradeExamName').value.trim(),
            score: parseFloat(document.getElementById('gradeScore').value)
        };

        // Basic validation
        if (!newGrade.term || !newGrade.date || !newGrade.subject || !newGrade.examName || isNaN(newGrade.score)) {
            alert('请填写所有成绩信息！');
            return;
        }
        
        if (!profileData.academic.grades) {
             profileData.academic.grades = []; // Ensure array exists
        }

        profileData.academic.grades.push(newGrade);
        // Sort grades by date after adding
        profileData.academic.grades.sort((a, b) => new Date(a.date) - new Date(b.date));

        displayGradeRecords();
        updateGradesCurveChart();
        updateGradeAnalysis();
        updateRecentHighlights(); // Update highlights with new grade info

        // Clear the form
        addGradeForm.reset();
        
        // Optional: Automatically save after adding
        // saveDataButton.click(); 
    });

    deleteLastGradeButton.addEventListener('click', function() {
         if (profileData.academic.grades && profileData.academic.grades.length > 0) {
             if (confirm('确定要删除最后一条成绩记录吗？')) {
                profileData.academic.grades.pop(); // Remove the last element
                displayGradeRecords();
                updateGradesCurveChart();
                updateGradeAnalysis();
                updateRecentHighlights();
                 // Optional: Automatically save after deleting
                 // saveDataButton.click(); 
             }
         } else {
            alert('没有成绩记录可以删除。');
         }
    });

    function displayGradeRecords() {
        gradeRecordsListDiv.innerHTML = ''; // Clear previous list

        if (!profileData.academic.grades || profileData.academic.grades.length === 0) {
            gradeRecordsListDiv.innerHTML = '<p>暂无成绩记录。</p>';
            return;
        }

        // Create a table for better formatting
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>学期</th>
                    <th>日期</th>
                    <th>学科</th>
                    <th>考试名称</th>
                    <th>成绩</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = table.querySelector('tbody');

        profileData.academic.grades.forEach(record => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${record.term || ''}</td>
                <td>${record.date || ''}</td>
                <td>${record.subject || ''}</td>
                <td>${record.examName || ''}</td>
                <td>${record.score !== undefined ? record.score : ''}</td>
            `;
        });

        gradeRecordsListDiv.appendChild(table);
    }


    // --- Charting ---

    // Radar Chart Update Function (remains mostly the same, ensure labels match)
    window.updateRadarChart = function(chartId, radarDataType) {
        const inputs = document.querySelectorAll(`input[data-radar="${radarDataType}"]`);
        // Use data-radar-label attribute for labels
        const labels = Array.from(inputs).map(input => input.getAttribute('data-radar-label'));
        const dataValues = Array.from(inputs).map(input => parseInt(input.value) || 0);

        let chartInstanceRef;
        const isSubjectAnalysis = radarDataType === 'subjectAnalysis';
        
        const chartConfig = {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: isSubjectAnalysis ? '学科强弱概览 (0-100)' : '价值观实践 (1-5)',
                    data: dataValues,
                    fill: true,
                    backgroundColor: isSubjectAnalysis ? 'rgba(255, 99, 132, 0.2)' : 'rgba(54, 162, 235, 0.2)',
                    borderColor: isSubjectAnalysis ? 'rgb(255, 99, 132)' : 'rgb(54, 162, 235)',
                    pointBackgroundColor: isSubjectAnalysis ? 'rgb(255, 99, 132)' : 'rgb(54, 162, 235)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: isSubjectAnalysis ? 'rgb(255, 99, 132)' : 'rgb(54, 162, 235)'
                }]
            },
            options: {
                elements: { line: { borderWidth: 3 } },
                scales: {
                    r: {
                        angleLines: { display: true },
                        suggestedMin: isSubjectAnalysis ? 0 : 1,
                        suggestedMax: isSubjectAnalysis ? 100 : 5,
                        ticks: { stepSize: isSubjectAnalysis ? 20 : 1 }
                    }
                },
                 plugins: {
                    legend: { display: true } // Ensure legend is displayed
                },
                responsive: true,
                maintainAspectRatio: true // Let container control size
            }
        };

        if (chartId === 'subjectAnalysisChart') {
            if (subjectAnalysisChartInstance) subjectAnalysisChartInstance.destroy();
            subjectAnalysisChartInstance = new Chart(document.getElementById(chartId), chartConfig);
        } else if (chartId === 'valuesDevelopmentChart') {
            if (valuesDevelopmentChartInstance) valuesDevelopmentChartInstance.destroy();
            valuesDevelopmentChartInstance = new Chart(document.getElementById(chartId), chartConfig);
        }
    }

    // Grades Curve Chart Update Function (Using Time Scale)
    function updateGradesCurveChart() {
        const grades = profileData.academic.grades || [];

        if (gradesCurveChartInstance) {
            gradesCurveChartInstance.destroy(); // Destroy previous instance
        }

        if (grades.length === 0) {
            // Optionally display a message or leave the canvas blank
             const ctx = document.getElementById('gradesCurveChart').getContext('2d');
             ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // Clear canvas
             ctx.font = "16px 'Microsoft YaHei'";
             ctx.fillStyle = "#888";
             ctx.textAlign = "center";
             ctx.fillText("添加成绩记录后将显示曲线图", ctx.canvas.width / 2, 50);
            return;
        }

        // Group data by subject
        const subjectsData = {};
        grades.forEach(record => {
            if (!record.subject || !record.date || record.score === undefined) return; // Skip incomplete records
            if (!subjectsData[record.subject]) {
                subjectsData[record.subject] = {
                    label: record.subject,
                    data: [],
                    borderColor: getRandomColor(),
                    tension: 0.1,
                    fill: false
                };
            }
            // Add data point {x: date, y: score}
            subjectsData[record.subject].data.push({ x: record.date, y: record.score });
        });

        // Sort data points within each subject by date for correct line drawing
        Object.values(subjectsData).forEach(dataset => {
            dataset.data.sort((a, b) => new Date(a.x) - new Date(b.x));
        });


        gradesCurveChartInstance = new Chart(
            document.getElementById('gradesCurveChart'),
            {
                type: 'line',
                data: {
                    datasets: Object.values(subjectsData) // Array of dataset objects
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Allow height adjustment
                    scales: {
                        x: {
                            type: 'time', // Use time scale
                            time: {
                                unit: 'month', // Adjust unit based on data span (e.g., 'day', 'week', 'month', 'year')
                                tooltipFormat: 'yyyy-MM-dd', // Format for tooltips
                                displayFormats: { // How dates are displayed on the axis
                                     month: 'yyyy-MM',
                                     day: 'MM-dd'
                                }
                            },
                            title: {
                                display: true,
                                text: '日期'
                            }
                        },
                        y: {
                            beginAtZero: false, // Grades rarely start at 0
                            suggestedMin: 50, // Adjust as needed
                            suggestedMax: 100,
                            title: {
                                display: true,
                                text: '成绩'
                            }
                        }
                    },
                    plugins: {
                        legend: { position: 'top' },
                        title: { display: true, text: '各科成绩时间曲线' },
                         tooltip: {
                             callbacks: {
                                // Add Exam Name to tooltip
                                afterBody: function(context) {
                                     const dataIndex = context[0].dataIndex;
                                     const datasetIndex = context[0].datasetIndex;
                                     const subject = gradesCurveChartInstance.data.datasets[datasetIndex].label;
                                     // Find the original record based on subject and data point index
                                     // This is a bit complex because data is resorted per subject
                                     // A better way might be to store the exam name with the point data {x, y, examName}
                                     // For simplicity, let's skip adding exam name here for now.
                                    return ''; 
                                }
                            }
                        }
                    }
                }
            }
        );
    }

    // Grade Analysis Function
    function updateGradeAnalysis() {
         const grades = profileData.academic.grades || [];
         gradeAnalysisTextDiv.innerHTML = ''; // Clear previous analysis
         if (grades.length < 2) { // Need at least two points for comparison
            gradeAnalysisTextDiv.innerHTML = '<p>（成绩记录不足两条，无法生成分析）</p>';
             return;
         }

         const analysisResults = [];
         const subjects = [...new Set(grades.map(g => g.subject).filter(Boolean))]; // Get unique subjects

         subjects.forEach(subject => {
             const subjectGrades = grades
                 .filter(g => g.subject === subject && g.date && g.score !== undefined)
                 .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date

             if (subjectGrades.length >= 2) {
                 const latest = subjectGrades[subjectGrades.length - 1];
                 const previous = subjectGrades[subjectGrades.length - 2];
                 const diff = latest.score - previous.score;
                 let analysis = `${subject}：最新(${latest.examName} ${latest.date})得分 ${latest.score}`;
                 if (diff > 0) {
                     analysis += `，较上次(${previous.examName})进步 ${diff.toFixed(1)} 分。👍`;
                 } else if (diff < 0) {
                     analysis += `，较上次(${previous.examName})退步 ${Math.abs(diff).toFixed(1)} 分。需关注。`;
                 } else {
                     analysis += `，与上次(${previous.examName})持平。`;
                 }
                 analysisResults.push(analysis);
             } else if (subjectGrades.length === 1) {
                analysisResults.push(`${subject}：仅有一次 (${subjectGrades[0].examName} ${subjectGrades[0].date}) 记录，得分 ${subjectGrades[0].score}。`);
             }
         });

         if (analysisResults.length > 0) {
             gradeAnalysisTextDiv.innerHTML = "<ul>" + analysisResults.map(a => `<li>${a}</li>`).join('') + "</ul>";
         } else {
              gradeAnalysisTextDiv.innerHTML = '<p>（无法生成分析，请检查成绩记录是否完整。）</p>';
         }
    }


    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    function initializeAllCharts() {
        updateRadarChart('subjectAnalysisChart', 'subjectAnalysis');
        updateRadarChart('valuesDevelopmentChart', 'valuesDevelopment');
        updateGradesCurveChart(); // Update with loaded or default grade data
        updateGradeAnalysis(); // Update analysis based on loaded data
    }

    // --- Initialization ---
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    loadProfileData(); // Load data when the page loads
    // Set initial active tab
    document.querySelector('nav button[data-target="home"]').classList.add('active-nav');
    document.getElementById('home').classList.add('active'); // Make home tab active initially

});