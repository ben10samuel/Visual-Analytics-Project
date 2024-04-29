$(document).ready(function() {
    let documents; // Variable to hold fetched documents
    let colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    // Function to fetch document IDs from the server
    function fetchDocumentIDs() {
        fetch('/documents')
            .then(response => response.json())
            .then(data => {
                documents = data;
                fetchAndRenderClusters();
                fetchAndRenderMDSPlot();
            })
            .catch(error => console.error(error));
    }

    // Function to fetch clusters from the clusters.json file and render them
    function fetchAndRenderClusters() {
        fetch('/clusters')
            .then(response => response.json())
            .then(clusters => renderClusters(clusters))
            .catch(error => console.error(error));
    }

    // Function to fetch and render the MDS plot
    // Function to fetch and render the MDS plot
    function fetchAndRenderMDSPlot() {
        // Assuming clusters are needed here to determine node colors
        Promise.all([
            fetch('/mds').then(res => res.json()),
            fetch('/clusters').then(res => res.json())
        ]).then(([mdsData, clusters]) => {
            renderMDSPlot(mdsData, clusters);
        }).catch(error => console.error('Error fetching data:', error));
    }


// Function to render document clusters
    function renderClusters(clusters) {
        const documentClusters = $('#documentClusters');
        documentClusters.empty(); // Clear existing clusters

        // Loop through clusters and render each cluster
        Object.keys(clusters).forEach(clusterId => {
            const cluster = clusters[clusterId];
            const clusterBlock = $('<div class="cluster-block"></div>');
            clusterBlock.attr('data-id', clusterId); // Add data-id attribute for cluster ID

            // Add cluster header
            const clusterHeader = $('<div class="cluster-header"></div>');
            clusterHeader.text(`Block ${clusterId}`);
            clusterBlock.append(clusterHeader);

            // Generate a random color for the cluster
            const clusterColor = colorScale(clusterId);

            // Add documents to the cluster block
            cluster.forEach(documentId => {
                const document = documents.find(doc => doc.fileName === documentId);
                if (document) {
                    const documentItem = $('<div class="document-item"></div>');
                    documentItem.text(document.fileName);
                    documentItem.attr('data-id', document.id);
                    documentItem.addClass('draggable'); // Add draggable class
                    documentItem.attr('data-cluster', clusterId); // Add data-cluster attribute
                    documentItem.css('background-color', clusterColor); // Apply cluster color
                    documentItem.click(handleDocumentItemClick); // Add click event handler
                    clusterBlock.append(documentItem);
                }
            });

            documentClusters.append(clusterBlock);
        });

        // Enable drag-and-drop functionality for document clusters
        documentClusters.sortable({
            items: '.cluster-block',
            cursor: 'move',
            containment: 'document',
            tolerance: 'pointer',
            placeholder: 'ui-state-highlight',
            revert: true,
            update: function(event, ui) {
                updateClusterOrder();
            }
        });

        // Add click event handler for cluster blocks
        $('.cluster-block').click(handleClusterBlockClick);
    }
    // Function to handle click event for document items
    function handleDocumentItemClick() {
        const documentId = $(this).data('id');
        const clusterId = $(this).closest('.cluster-block').data('id');

        // Show/hide cluster content based on current visibility state
        const clusterContent = $(`.cluster-block[data-id="${clusterId}"] .document-item`);
        const isClusterVisible = clusterContent.is(':visible');
        clusterContent.toggle(!isClusterVisible);

        // Update workspace content for multiple selection
        updateWorkspaceContent(clusterId, isClusterVisible);
    }

    // Function to handle click event for cluster blocks
    function handleClusterBlockClick(event) {
        // Prevent click event propagation to document items
        event.stopPropagation();

        // Toggle visibility of cluster content
        const clusterId = $(this).data('id');
        const clusterContent = $(`.cluster-block[data-id="${clusterId}"] .document-item`);
        const isClusterVisible = clusterContent.is(':visible');
        clusterContent.toggle(!isClusterVisible);

        // Update workspace content for multiple selection
        updateWorkspaceContent(clusterId, isClusterVisible);
    }

    // Function to update workspace content based on selected document IDs
    function updateWorkspaceContent(clusterId, isVisible) {
        // Show cluster content if it's not visible
        if (!isVisible) {
            const clusterBlock = $(`.cluster-block[data-id="${clusterId}"]`);
            const clusterHeader = clusterBlock.find('.cluster-header').text();
            let clusterContent = '';

            // Get content of documents in the cluster
            clusterBlock.find('.document-item').each(function() {
                const documentId = $(this).data('id');
                const document = documents.find(doc => doc.id === documentId);
                if (document) {
                    clusterContent += `<div class="document-content"><h4>${document.fileName}</h4><p>${document.content || 'No content available'}</p></div>`;
                } else {
                    console.log("No document found for ID:", documentId);  // Log if no document is found
                }
            });

            // Update workspace content with cluster header and content
            $('#documentWorkspace').html(`<div class="cluster-header">${clusterHeader}</div>${clusterContent}`);
        }
    }


    // Function to update cluster order on the server
    function updateClusterOrder() {
        const orderedClusterIds = $('#documentClusters').sortable('toArray', { attribute: 'data-id' });

        fetch('/updateClusterOrder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderedClusterIds: orderedClusterIds })
        })
            .then(response => response.text())
            .then(message => console.log(message))
            .catch(error => console.error(error));
    }

    function renderMDSPlot(mdsData, clusters) {
        const svgWidth = 800, svgHeight = 600;
        const margin = { top: 50, right: 50, bottom: 50, left: 50 };
        const width = svgWidth - margin.left - margin.right;
        const height = svgHeight - margin.top - margin.bottom;

        const svg = d3.select('#mdsPlot').append('svg')
            .attr('width', svgWidth)
            .attr('height', svgHeight)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        const xScale = d3.scaleLinear()
            .domain(d3.extent(mdsData, d => d.x))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(mdsData, d => d.y))
            .range([height, 0]);

        const xAxis = d3.axisBottom(xScale);
        const yAxis = d3.axisLeft(yScale);

        svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis);

        svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis);

        // Create a tooltip
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        svg.selectAll('.node')
            .data(mdsData)
            .enter()
            .append('circle')
            .attr('class', 'node')
            .attr('r', 5)
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
            .style('fill', d => colorScale(d.clusterId)) // Apply color from the shared scale
            .attr('data-id', d => d.id)
            .on('mouseover', function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(d.id) // Assuming d.id holds the file name
                    .style("left", (event.pageX + 5) + "px") // 5 pixels to the right from the cursor
                    .style("top", (event.pageY + 5) + "px"); // 5 pixels below the cursor
            })
            .on('mouseout', function(event, d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .on('click', function (event, d) {
                const isActive = d3.select(this).classed('highlight');
                d3.select(this).classed('highlight', !isActive);
                if(isActive) {
                    unhighlightDocument(d.id);
                } else {
                    highlightDocument(d.id);
                }
                openDocument(d.id);
            });
    }



    // Function to highlight the corresponding document ID in the list
    function highlightDocument(documentId) {
        $('.document-item').each(function() {
            if ($(this).data('id') === documentId) {
                $(this).addClass('highlight');
            }
        });
    }

    // Function to unhighlight the corresponding document ID in the list
    function unhighlightDocument(documentId) {
        $('.document-item').each(function() {
            if ($(this).data('id') === documentId) {
                $(this).removeClass('highlight');
            }
        });
    }

    // Function to open the corresponding document in the workspace
    function openDocument(documentId) {
        if (!documentId) {
            console.error('Document ID is undefined');
            alert('No document ID provided');
            return;
        }

        fetch(`/documents/${documentId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(document => {
                const workspace = $('#documentWorkspace');
                workspace.empty();
                const contentElement = $('<div class="document-content"></div>');
                contentElement.append(`<h2>${document.id}</h2>`);
                contentElement.append(`<p>${document.content}</p>`);
                workspace.append(contentElement);
            })
            .catch(error => {
                console.error('Error fetching document:', error);
                alert('Error fetching document content. ' + error.message);
            });
    }


    fetchDocumentIDs();

});
