/**
 * Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
     initApp();
});

async function initApp() {
     const loadingScreen = document.getElementById('loading-screen');

     // Security Check: Web Crypto API requires Secure Context (HTTPS or localhost)
     if (!window.isSecureContext && window.location.protocol !== 'file:') {
          // Some browsers allow file:, some don't. We generally need crypto.subtle.
     }

     if (!window.crypto || !window.crypto.subtle) {
          showError(
               'غير مدعوم',
               'المتصفح لا يدعم التشفير في هذا الوضع. يرجى تشغيل الموقع عبر خادم محلي (localhost) أو HTTPS وليس بفتح الملف مباشرة.'
          );
          return;
     }

     const params = new URLSearchParams(window.location.search);
     const publicKey = params.get('public_key');
     const privateKey = params.get('private_key');

     if (!publicKey || !privateKey) {
          showError('نقص في البيانات', 'يرجى التأكد من الرابط الصحيح الذي يحتوي على المفاتيح العامة والخاصة.');
          return;
     }

     try {
          // Fetch and Decrypt
          updateLoadingStatus('جاري جلب البيانات...');

          const data = await fetchAndDecrypt(publicKey, privateKey);

          // Validate Data Structure
          if (!data || !data.student_name || !Array.isArray(data.subjects)) {
               console.error('Invalid Data:', data);
               throw new Error('البيانات غير صالحة أو تالفة');
          }

          renderDashboard(data);
          loadingScreen.style.opacity = '0';
          setTimeout(() => loadingScreen.remove(), 500);

     } catch (error) {
          console.error(error);
          showError('خطأ في التحميل', error.message || 'فشل فك التشفير أو الملف غير موجود.');
     }
}

async function fetchAndDecrypt(publicKey, privateKey) {
     const path = `assets/analysis/${publicKey}`;

     try {
          let encryptedData;
          const response = await fetch(path);

          if (!response.ok) {
               const jsonResponse = await fetch(`${path}.json`);
               if (!jsonResponse.ok) {
                    throw new Error('الملف غير موجود');
               }
               encryptedData = await jsonResponse.text();
          } else {
               encryptedData = await response.text();
          }

          const decryptedString = await EncryptionUtils.decryptFromDart(encryptedData, privateKey);
          return JSON.parse(decryptedString);

     } catch (e) {
          throw e;
     }
}

function renderDashboard(data) {
     // 1. Header Info
     const isMale = data.is_male === 'true' || data.is_male === true;
     const honorific = isMale ? 'بشمهندس' : 'بشمهندسة';
     const fullName = `${honorific} / ${data.student_name || 'طالب مجهول'}`;

     document.getElementById('student-name').textContent = fullName;
     document.title = data.student_name || 'نتيجة الطالب';

     // Remove Gender Box (as requested)
     document.getElementById('student-gender').style.display = 'none';

     // 2. Key Stats (Reordered: Rank -> Degree -> Accuracy[optional])

     // RANK Logic
     const rankContainer = document.getElementById('header-rank');
     const rankValEl = document.getElementById('val-rank');

     // Move Rank to first position in grid if possible, or just re-render logic here
     // To strictly move it visually, we might need to rely on CSS order or DOM manipulation, 
     // but the IDs are hardcoded in HTML. We will update content and styles.

     if (rankContainer) {
          if (data.rank > 0) {
               let crownHtml = '';
               let rankClass = '';

               if (data.rank === 1) {
                    crownHtml = '<span class="rank-crown">👑</span>';
                    rankClass = 'rank-gold';
               } else if (data.rank === 2) {
                    crownHtml = '<span class="rank-crown">🥈</span>';
                    rankClass = 'rank-silver';
               } else if (data.rank === 3) {
                    crownHtml = '<span class="rank-crown">🥉</span>';
                    rankClass = 'rank-bronze';
               }

               rankContainer.innerHTML = `
                 <div class="rank-display-large ${rankClass}">
                     ${crownHtml}
                     <div class="rank-text-large">#${data.rank}</div>
                 </div>
               `;
               rankContainer.style.display = 'flex';
          } else {
               rankContainer.style.display = 'none';
          }
     }

     // Total Degree (Circular Progress)
     const degreeCard = document.getElementById('stat-degree');
     const total = parseFloat(data.total_degree);
     const full = parseFloat(data.full_degree);
     const degreePercent = (total / full) * 100;
     const totalGradeInfo = getGrade(degreePercent);

     // Grade Badge BENEATH the progress (Behind it with semi-transparency)
     // Rank is REMOVED from here because it is already in the header
     degreeCard.innerHTML = `
         <div class="circular-progress-container" style="position: relative; width: 250px; height: 250px; margin: 0 auto; display: flex; justify-content: center; align-items: center;">
             <div class="${totalGradeInfo.class}" style="font-size: 8rem; font-weight: 900; line-height: 1; opacity: 0.15; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 0; text-shadow: 0 0 20px rgba(255,255,255,0.1); direction: ltr;">${totalGradeInfo.text}</div>
             
             <svg viewBox="0 0 36 36" class="circular-chart" style="display: block; width: 100%; transform: rotate(-90deg); position: absolute; top:0; left:0; z-index: 1;">
                 <path class="circle-bg"
                     d="M18 2.0845
                         a 15.9155 15.9155 0 0 1 0 31.831
                         a 15.9155 15.9155 0 0 1 0 -31.831"
                     style="fill: none; stroke: rgba(255, 255, 255, 0.05); stroke-width: 2;"
                 />
                 <path class="circle"
                     stroke-dasharray="${degreePercent}, 100"
                     d="M18 2.0845
                         a 15.9155 15.9155 0 0 1 0 31.831
                         a 15.9155 15.9155 0 0 1 0 -31.831"
                     style="fill: none; stroke: var(--accent-color); stroke-width: 2; stroke-linecap: round; transition: stroke-dasharray 1s ease-in-out;"
                 />
             </svg>
             <div class="circle-text" style="position: relative; text-align: center; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; direction: ltr;">
                 <div style="font-size: 2.2rem; font-weight: 700; color: #fff; line-height: 1.2;">${degreePercent.toFixed(2)}%</div>
                 <div style="font-size: 1rem; color: var(--text-secondary); margin-top: 0.5rem;">${total.toFixed(2)} / ${full.toFixed(2)}</div>
             </div>
         </div>
      `;

     // Accuracy (Moved to bottom footer)
     // First remove the old card if it exists in grid
     const oldAccContainer = document.getElementById('stat-accuracy');
     if (oldAccContainer) oldAccContainer.style.display = 'none';

     const accuracyVal = parseFloat(data.accuracy);
     if (!isNaN(accuracyVal) && data.accuracy !== null) {
          let footer = document.querySelector('footer');
          if (!footer) {
               footer = document.createElement('footer');
               footer.style = "text-align: center; margin-top: 3rem; padding: 2rem; border-top: 1px solid var(--card-border); color: var(--text-secondary);";
               document.querySelector('.container').appendChild(footer);
          }
          footer.innerHTML = `
            <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.05); padding: 0.5rem 1.5rem; border-radius: 99px;">
                <span>دقة الاحصائيات:</span>
                <span style="color: var(--accent-color); font-weight: 700;">${(accuracyVal * 100).toFixed(2)}%</span>
            </div>
          `;
     }


     // 3. Subjects List (Grid Layout)
     const listContainer = document.getElementById('subjects-list');
     listContainer.innerHTML = '';

     if (data.subjects && data.subjects.length > 0) {
          const sortedSubjects = [...data.subjects].sort((a, b) => b.degree - a.degree);

          sortedSubjects.forEach(sub => {
               const card = document.createElement('div');
               card.className = 'subject-card';

               const degreeVal = parseFloat(sub.degree);
               const fullDegreeVal = parseFloat(sub.full_degree);
               const percentage = (degreeVal / fullDegreeVal) * 100;
               const avgVal = parseFloat(sub.average_degree).toFixed(2);

               // Grade Logic
               let gradeInfo = { text: '', class: '' };
               let statusText = '';
               let isFailed = false;

               if (degreeVal <= 0) {
                    statusText = 'راسب'; // Failed
                    isFailed = true;
                    gradeInfo = { text: 'F', class: 'grade-F' };
                    card.classList.add('is-failed');
               } else {
                    gradeInfo = getGrade(percentage);
               }

               // Rank badge for subjects
               const rankBadge = sub.rank > 0
                    ? `<span class="rank-badge">#${sub.rank}</span>`
                    : '';

               card.innerHTML = `
                <div class="grade-badge ${gradeInfo.class}">${gradeInfo.text}</div>
                <div class="subject-info">
                    <h3>${sub.name}</h3>
                    <div class="subject-meta">
                        <span>المتوسط: ${avgVal}</span>
                        ${rankBadge}
                    </div>
                </div>
                
                <div class="subject-score">
                    <div>
                         <div class="score-value">${isFailed ? statusText : degreeVal.toFixed(2)}</div>
                         ${!isFailed ? `<div class="score-total">من ${fullDegreeVal.toFixed(2)}</div>` : ''}
                    </div>
                    ${!isFailed ? `
                    <div style="flex-grow: 1; margin-right: 1.5rem; height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; position: relative;">
                         <div style="position: absolute; top: 0; right: 0; height: 100%; width: ${percentage}%; background: var(--accent-color); border-radius: 4px;"></div>
                    </div>` : ''}
                </div>
            `;
               listContainer.appendChild(card);
          });

          if (typeof Chart !== 'undefined') {
               renderCharts(data);
          }
     } else {
          listContainer.innerHTML = '<p class="text-muted" style="text-align:center;">لا توجد مواد.</p>';
     }
}

function getGrade(percentage) {
     if (percentage >= 97) return { text: 'A+', class: 'grade-A-plus' };
     if (percentage >= 94) return { text: 'A', class: 'grade-A' };
     if (percentage >= 90) return { text: 'A-', class: 'grade-A-minus' };
     if (percentage >= 87) return { text: 'B+', class: 'grade-B-plus' };
     if (percentage >= 83) return { text: 'B', class: 'grade-B' };
     if (percentage >= 80) return { text: 'B-', class: 'grade-B-minus' };
     if (percentage >= 77) return { text: 'C+', class: 'grade-C-plus' };
     if (percentage >= 73) return { text: 'C', class: 'grade-C' };
     if (percentage >= 70) return { text: 'C-', class: 'grade-C-minus' };
     if (percentage >= 67) return { text: 'D+', class: 'grade-D-plus' };
     if (percentage >= 60) return { text: 'D', class: 'grade-D' };
     return { text: 'F', class: 'grade-F' };
}

function renderCharts(data) {
     const ctx = document.getElementById('scoreChart').getContext('2d');

     const labels = data.subjects.map(s => s.name);
     const scores = data.subjects.map(s => s.degree);
     const fullScores = data.subjects.map(s => s.full_degree);

     new Chart(ctx, {
          type: 'bar',
          data: {
               labels: labels,
               datasets: [{
                    label: 'درجة الطالب',
                    data: scores,
                    backgroundColor: 'rgba(139, 92, 246, 0.7)',
                    borderColor: '#8b5cf6',
                    borderWidth: 1,
                    borderRadius: 4
               }, {
                    label: 'الدرجة الكاملة',
                    data: fullScores,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    borderRadius: 4,
                    hidden: false // User requested: "always enable ... at first"
               }]
          },
          options: {
               responsive: true,
               maintainAspectRatio: false,
               scales: {
                    y: {
                         beginAtZero: true,
                         grid: {
                              color: 'rgba(255, 255, 255, 0.05)'
                         },
                         ticks: {
                              color: '#94a3b8',
                              font: {
                                   family: "'Cairo', sans-serif"
                              }
                         }
                    },
                    x: {
                         grid: {
                              display: false
                         },
                         ticks: {
                              color: '#94a3b8',
                              font: {
                                   family: "'Cairo', sans-serif"
                              }
                         }
                    }
               },
               plugins: {
                    legend: {
                         labels: {
                              color: '#f8fafc',
                              font: {
                                   family: "'Cairo', sans-serif"
                              }
                         }
                    },
                    tooltip: {
                         titleFont: {
                              family: "'Cairo', sans-serif"
                         },
                         bodyFont: {
                              family: "'Cairo', sans-serif"
                         }
                    }
               }
          }
     });
}

function showError(title, message) {
     const loadingScreen = document.getElementById('loading-screen');
     const errorScreen = document.getElementById('error-screen');
     const errorTitle = document.getElementById('error-title');
     const errorMsg = document.getElementById('error-msg');

     if (loadingScreen) loadingScreen.style.display = 'none';

     errorScreen.style.display = 'flex';
     errorTitle.textContent = title;
     errorMsg.textContent = message;
}

function updateLoadingStatus(text) {
     const el = document.getElementById('loading-text');
     if (el) el.textContent = text;
}
