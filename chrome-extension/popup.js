document.addEventListener('DOMContentLoaded', () => {
  // MCP Query logic
  const mcpQueryInput = document.getElementById('mcp-query');
  const mcpQueryBtn = document.getElementById('submit-mcp-query');
  // Create or select a div to show the MCP response
  let mcpResponseDiv = document.getElementById('mcp-response');
  if (!mcpResponseDiv) {
    mcpResponseDiv = document.createElement('div');
    mcpResponseDiv.id = 'mcp-response';
    mcpResponseDiv.style.margin = '8px 8px 16px 8px';
    mcpResponseDiv.style.padding = '8px';
    mcpResponseDiv.style.background = '#f5f5f5';
    mcpResponseDiv.style.borderRadius = '4px';
    mcpResponseDiv.style.fontSize = '0.95em';
    // Insert after the input container and before the h2
    const inputContainer = mcpQueryInput.parentNode;
    const h2 = document.querySelector('h2');
    h2.parentNode.insertBefore(mcpResponseDiv, h2);
  }
  mcpQueryBtn.onclick = async () => {
    const userQuery = mcpQueryInput.value.trim();
    if (!userQuery) {
      mcpResponseDiv.textContent = 'Please enter a query.';
      return;
    }
    mcpResponseDiv.textContent = 'Querying MCP Server...';
    try {
      const res = await fetch('http://localhost:8000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery })
      });
      const result = await res.json();
      mcpResponseDiv.textContent = '';
      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify(result, null, 2);
      mcpResponseDiv.appendChild(pre);
    } catch (e) {
      mcpResponseDiv.textContent = 'Error querying MCP Server: ' + e;
    }
  };

  // Existing metric logic...
  document.getElementById('load').onclick = async () => {
    const res = await fetch('https://semantic-layer.cloud.getdbt.com/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dbtc_UT8ssNAAbOMpN_Pq7FJl1pAj_atHrSX0Y3mzeoLFtJARUs8G0c'
      },
      body: JSON.stringify({
        query: `
          {
            metrics(environmentId: 363314) {
              name
              description
            }
          }
        `
      })
    });
    const result = await res.json();
    const metrics = result.data.metrics;
    const ul = document.getElementById('metrics');
    ul.innerHTML = '';
    // Hide the global chart canvas if present
    const globalChartCanvas = document.getElementById('metricChart');
    if (globalChartCanvas) globalChartCanvas.style.display = 'none';

    // Show the filter input
    const filterInput = document.getElementById('metric-filter');
    filterInput.style.display = '';
    filterInput.value = '';

    // Filtering logic
    function renderMetricList(filterText) {
      ul.innerHTML = '';
      metrics
        .filter(m => {
          if (!filterText) return true;
          const t = filterText.toLowerCase();
          return m.name.toLowerCase().includes(t) || (m.description && m.description.toLowerCase().includes(t));
        })
        .forEach(m => {
          const li = document.createElement('li');
          // Make name and description bold
          li.innerHTML = `<strong>${m.name}: ${m.description}</strong>`;
          li.style.cursor = 'pointer';
          li.onclick = async () => {
            // Remove any previous chart or export/notification button below this li
            while (li.nextSibling && (li.nextSibling.classList && (li.nextSibling.classList.contains('metric-chart-canvas') || li.nextSibling.classList.contains('export-btn') || li.nextSibling.classList.contains('notify-btn')))) {
              li.nextSibling.remove();
            }
            // Use hardcoded months
            const months = [
              'Jan 24', 'Feb 24', 'Mar 24', 'Apr 24', 'May 24', 'Jun 24',
              'Jul 24', 'Aug 24', 'Sep 24', 'Oct 24', 'Nov 24', 'Dec 24'
            ];
            // Deterministic dummy data based on metric name and trend
            const isIncreasing = m.name.charCodeAt(0) % 2 === 0;
            let base = 1000 + (m.name.charCodeAt(0) * 10) % 500;
            const values = months.map((_, i) => {
              const trend = isIncreasing ? i * 50 : (months.length - 1 - i) * 50;
              return Math.round(base + trend + Math.sin(i + m.name.length) * 100);
            });
            // Calculate average and color
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const latest = values[values.length - 1];
            const mainColor = latest < avg ? 'rgba(220, 38, 38, 1)' : 'rgba(34, 197, 94, 1)'; // red or green
            const mainBg = latest < avg ? 'rgba(220, 38, 38, 0.2)' : 'rgba(34, 197, 94, 0.2)';
            // Create a new canvas for this chart
            const chartCanvas = document.createElement('canvas');
            chartCanvas.width = 280;
            chartCanvas.height = 180;
            chartCanvas.className = 'metric-chart-canvas';
            // Insert the canvas after the li
            li.parentNode.insertBefore(chartCanvas, li.nextSibling);
            // Destroy previous chart instance for this li if exists
            if (li.metricChartInstance) {
              li.metricChartInstance.destroy();
            }
            li.metricChartInstance = new Chart(chartCanvas, {
              type: 'line',
              data: {
                labels: months,
                datasets: [
                  {
                    label: m.name,
                    data: values,
                    borderColor: mainColor,
                    backgroundColor: mainBg,
                    fill: true,
                    tension: 0.3
                  },
                  {
                    label: 'Average',
                    data: Array(values.length).fill(avg),
                    borderColor: '#888',
                    borderDash: [6, 6],
                    pointRadius: 0,
                    fill: false,
                    tension: 0
                  }
                ]
              },
              options: {
                responsive: false,
                plugins: {
                  legend: { display: true }
                },
                scales: {
                  y: { beginAtZero: true }
                }
              }
            });
            // Add Export Data button
            const exportBtn = document.createElement('button');
            exportBtn.textContent = 'Export Data';
            exportBtn.className = 'btn export-btn';
            exportBtn.style.marginTop = '10px';
            exportBtn.onclick = () => {
              let csv = 'Month,Value\n';
              for (let i = 0; i < months.length; i++) {
                csv += `"${months[i]}",${values[i]}\n`;
              }
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${m.name}-data.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            };
            // Add Manage Notifications button
            const notifyBtn = document.createElement('button');
            notifyBtn.textContent = 'Manage Notifications';
            notifyBtn.className = 'btn notify-btn';
            notifyBtn.style.marginTop = '10px';
            notifyBtn.style.marginLeft = '10px';
            notifyBtn.onclick = () => {
              alert('Manage Notifications for ' + m.name);
            };
            // Insert both buttons after the chart
            li.parentNode.insertBefore(exportBtn, chartCanvas.nextSibling);
            li.parentNode.insertBefore(notifyBtn, exportBtn.nextSibling);
          };
          ul.appendChild(li);
        });
    }
    renderMetricList('');
    filterInput.oninput = (e) => {
      renderMetricList(e.target.value);
    };
  };
}); 