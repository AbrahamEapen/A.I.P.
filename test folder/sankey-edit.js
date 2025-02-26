d3.sankey = function() {
  
	var sankey = {},
      nodeWidth = 24,
      nodePadding = 8,
      size = [1, 1],
	  align = 'justify', // Gabe - left, right, center or justify
      nodes = [],
      links = [],
      overlapLinksAtSources = false,
      overlapLinksAtTargets = false,
      minValue = 1;

  sankey.nodeWidth = function(_) {
    if (!arguments.length) return nodeWidth;
    nodeWidth = +_;
    return sankey;
  };

  sankey.nodePadding = function(_) {
    if (!arguments.length) return nodePadding;
    nodePadding = +_;
    return sankey;
  };

  sankey.nodes = function(_) {
    if (!arguments.length) return nodes;
    nodes = _;
    return sankey;
  };

  sankey.links = function(_) {
    if (!arguments.length) return links;
    links = _;
    return sankey;
  };

  sankey.size = function(_) {
    if (!arguments.length) return size;
    size = _;
    return sankey;
  };

  sankey.overlapLinksAtSources = function(_) {
    if (!arguments.length) return overlapLinksAtSources;
    overlapLinksAtSources = _;
    return sankey;
  };

  sankey.overlapLinksAtTargets = function(_) {
    if (!arguments.length) return overlapLinksAtTargets;
    overlapLinksAtTargets = _;
    return sankey;
  };

  sankey.minValue = function(_) {
    if (!arguments.length) return minValue;
    minValue = _;
    return sankey;
  };

  sankey.layout = function(iterations) {
    computeNodeLinks();
    computeNodeValues();
    computeNodeBreadths();
    computeNodeDepths(iterations);
    computeLinkDepths();
    return sankey;
  };

  sankey.relayout = function() {
    computeLinkDepths();
    return sankey;
  };

  sankey.link = function() {
    var curvature = .5;

    function link(d) {
      var x0 = d.source.x + d.source.dx,
          x1 = d.target.x,
          xi = d3.interpolateNumber(x0, x1),
          x2 = xi(curvature),
          x3 = xi(1 - curvature),
          y0 = d.source.y + (overlapLinksAtSources ? 0 : d.sy) + d.dy / 2,
          y1 = d.target.y + (overlapLinksAtTargets ? 0 : d.ty) + d.dy / 2;
      return "M" + x0 + "," + y0
           + "C" + x2 + "," + y0
           + " " + x3 + "," + y1
           + " " + x1 + "," + y1;
    }

    link.curvature = function(_) {
      if (!arguments.length) return curvature;
      curvature = +_;
      return link;
    };

    return link;
  };

  // Populate the sourceLinks and targetLinks for each node.
  // Also, if the source and target are not objects, assume they are indices.
  function computeNodeLinks() {
    nodes.forEach(function(node) {
      node.sourceLinks = [];
      node.targetLinks = [];
    });
    links.forEach(function(link) {
      var source = link.source,
          target = link.target;
      if (typeof source === "number") source = link.source = nodes[link.source];
      if (typeof target === "number") target = link.target = nodes[link.target];
      source.sourceLinks.push(link);
      target.targetLinks.push(link);
		
		
      if ("value" in link)
        link.value = Math.max(link.value, minValue);
      else
        link.value = minValue;
    });
  }
    //
	//
	//
  // Compute the value (size) of each node by summing the associated links.
  function computeNodeValues() {
    nodes.forEach(function(node) {
      if ("value" in node)
        node.value = Math.max(node.value, minValue);
      else
        node.value = minValue;
      if (node.sourceLinks.length > 0) {
        if (overlapLinksAtSources)
          node.value = Math.max(node.value, d3.max(node.sourceLinks, value));
        else
          node.value = Math.max(node.value, d3.sum(node.sourceLinks, value));
      }
      if (node.targetLinks.length > 0) {
        if (overlapLinksAtTargets)
          node.value = Math.max(node.value, d3.max(node.targetLinks, value));
        else
          node.value = Math.max(node.value, d3.sum(node.targetLinks, value));
      }
    });
  }

  // Iteratively assign the breadth (x-position) for each node.
  // Nodes are assigned the maximum breadth of incoming neighbors plus one;
  // nodes with no incoming links are assigned breadth zero, while
  // nodes with no outgoing links are assigned the maximum breadth.
  function computeNodeBreadths() {
    var remainingNodes = nodes,
        nextNodes,
        x = 0;

    while (remainingNodes.length) {
      nextNodes = [];
      remainingNodes.forEach(function(node) {
        node.x = x;
        node.dx = nodeWidth;
        
		  
		  
		  node.sourceLinks.forEach(function(link) {
          nextNodes.push(link.target);
        });
      });
		
		
      remainingNodes = nextNodes;
      ++x;
    }

    //Gabe - Alignment Stuff
	
	  //moveSourcesRight(x); 
    	//moveSinksRight(x);  //Gabe - add back for full justify
	 
    scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
  }

  function moveSourcesRight() {
    nodes.forEach(function(node) {
     
		
		
		if (!node.targetLinks.length) {
        node.x = d3.min(node.sourceLinks, function(d) { return d.target.x; }) - 1;
      }
    });
  }

	
	
	
  function moveSinksRight(x) {
    nodes.forEach(function(node) {
      if (!node.sourceLinks.length) {
        node.x = x - 1;
      }
    });
  }

	function moveSinksLeft(x) {
    nodes.forEach(function(node) {
      if (!node.sourceLinks.length) {
        node.x =  1 - x;
      }
    });
  }
	
	
  function scaleNodeBreadths(kx) {
    nodes.forEach(function(node) {
      node.x *= kx;
    });
  }

  function computeNodeDepths(iterations) {
    var nodesByBreadth = d3.nest()
        .key(function(d) { return d.x; })
        .sortKeys(d3.ascending)
        .entries(nodes)
        .map(function(d) { return d.values; });

    //
    initializeNodeDepth();
    resolveCollisions();
    for (var alpha = 1; iterations > 0; --iterations) {
      relaxRightToLeft(alpha *= .99);
      resolveCollisions();
      relaxLeftToRight(alpha);
      resolveCollisions();
    }

    function initializeNodeDepth() {
      var ky = d3.min(nodesByBreadth, function(nodes) {
        return (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value);
      });

      nodesByBreadth.forEach(function(nodes) {
        nodes.forEach(function(node, i) {
          node.y = i;
          node.dy = node.value * ky;
        });
      });

      links.forEach(function(link) {
        link.dy = link.value * ky;
      });
    }

   function relaxLeftToRight(alpha) {
  nodesByBreadth.forEach(function(nodes, breadth) {
    nodes.forEach(function(node) {
      if (node.targetLinks.length) {
        // Value-weighted average of the y-position of source node centers linked to this node.
        // var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
        var y = d3.sum(node.targetLinks) ;
        node.y += (y - center(node)) * alpha;
      }
    });
  });

  function weightedSource(link) {
    return (link.source.y + link.sy + link.dy / 2) * link.value;
  }
}

	  //Gabe - Sort the Ininitial Nodes
function relaxRightToLeft(alpha) {
  nodesByBreadth.slice().reverse().forEach(function(nodes) {
    nodes.forEach(function(node) {
      if (node.sourceLinks.length) {
        // Value-weighted average of the y-positions of target nodes linked to this node.
        // var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
        var y = d3.sum(node.sourceLinks);
        node.y += (y - center(node)) * alpha;
      }
    });
  });

  function weightedTarget(link) {
    return (link.target.y + link.ty + link.dy / 2) * link.value;
  }
}
//Gabe - End Sort
	  
	  
    function resolveCollisions() {
      nodesByBreadth.forEach(function(nodes) {
        var node,
            dy,
            y0 = 0,
            n = nodes.length,
            i;

        // Push any overlapping nodes down.
        nodes.sort(ascendingDepth);
        for (i = 0; i < n; ++i) {
          node = nodes[i];
          dy = y0 - node.y;
          if (dy > 0) node.y += dy;
          y0 = node.y + node.dy + nodePadding;
        }

        // If the bottommost node goes outside the bounds, push it back up.
        dy = y0 - nodePadding - size[1];
        if (dy > 0) {
          y0 = node.y -= dy;

          // Push any overlapping nodes back up.
          for (i = n - 2; i >= 0; --i) {
            node = nodes[i];
            dy = node.y + node.dy + nodePadding - y0;
            if (dy > 0) node.y -= dy;
            y0 = node.y;
          }
        }
      });
    }

    function ascendingDepth(a, b) {
      return a.y - b.y;
    }
  }
//Gabe -some sort stuff here for Links/lines
  
	
		function computeLinkDepths() {
  	  nodes.forEach(function(node) {
		console.log(node.sourceLinks); //Gabe- added Line
  	  node.sourceLinks.sort(descendingLinkSize); // Gabe-was ascendingTargetDepth
  	  node.targetLinks.sort(descendingLinkSize);  // Gabe-was ascendingSourceDepth
  
	   });
	  
	 
		
		
		
		
		
	 
    nodes.forEach(function(node) {
      var sy = 0, ty = 0;
      node.sourceLinks.forEach(function(link) {
        link.sy = sy;
        sy += link.dy;
      });
      node.targetLinks.forEach(function(link) {
        link.ty = ty;
        ty += link.dy;
      });
    });

    function ascendingSourceDepth(a, b) {
      return a.source.y - b.source.y;
    }

    function ascendingTargetDepth(a, b) {
      return a.target.y - b.target.y;
    }
	
	  // Gabe - function to sort by link type !WORKS!
	 function ascendingLinkSize(a, b) {
  return a.value - b.value;
  // return 0;
} 
	    // Gabe - function to sort by link type !WORKS!
	 function descendingLinkSize(a, b) {
  return  b.value - a.value ;
  // return 0;
} 
	  	// function to sort by link type
	//  function typeSort(a, b) {
		//if(a.type < b.type) return -1;
		//if(a.type > b.type) return 1;} 
	  
	  
  }
//Gabe - Controls Node Sorting
  function center(node) {
    return node.y + node.dy / 2;
	  // return 0;
  }

  function value(link) {
    return link.value;
  }

  return sankey;
};


