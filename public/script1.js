$(document).ready(function() {
    let documents; // Variable to hold fetched documents

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

// Function to generate a random color
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
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
            const clusterColor = getRandomColor();

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



    // Function to update document order on the server
    function updateDocumentOrder() {
        const orderedIds = $('.cluster-block').map(function() {
            return $(this).sortable('toArray', { attribute: 'data-id' });
        }).get();

        // Flatten the ordered IDs array
        const flattenedIds = [].concat.apply([], orderedIds);

        fetch('/updateDocumentOrder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderedIds: flattenedIds })
        })
            .then(response => response.text())
            .then(message => console.log(message))
            .catch(error => console.error(error));
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
        console.log("MDS Data:", mdsData);
        const svg = d3.select('#mdsPlot').append('svg')
            .attr('width', 800)
            .attr('height', 600);

        const xScale = d3.scaleLinear()
            .domain(d3.extent(mdsData, d => d.x))
            .range([0, 800]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(mdsData, d => d.y))
            .range([0, 600]);

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        svg.selectAll('.node')
            .data(mdsData)
            .enter()
            .append('circle')
            .attr('class', 'node')
            .attr('r', 5)
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
            .style('fill', d => colorScale(d.clusterId))
            .attr('data-id', d => d.id)  // Ensure each node has a 'data-id' attribute
            .on('click', function (event, d) {
                console.log("Clicked node ID:", d.id);
                openDocument(d.id);  // Pass 'd.id' directly from the bound data
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
        console.log("Attempting to fetch document with ID:", documentId);

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
    //fetchAndRenderMDSPlot();
});
