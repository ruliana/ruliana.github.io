setTimeout(function() {
  "use strict";

  class BoxZone {
    constructor(chart, indexes) {
      this.chart = chart;
      this.indexes = indexes;
    }

    get hasData() { return this.indexes.length > 0 }
    get minIndex() { return math.min(this.indexes) }
    get maxIndex() { return math.max(this.indexes) }
    get minYValue() { return math.min(this.chart.yData.slice(this.minIndex, this.maxIndex + 1)) }
    get maxYValue() { return math.max(this.chart.yData.slice(this.minIndex, this.maxIndex + 1)) }

    get xTargetMinPixel() { this.chart.xAxis.toPixels(this.chart.xData[this.minIndex]) }
    get xTargetMaxPixel() { this.chart.xAxis.toPixels(this.chart.xData[this.maxIndex]) }
    get yTargetMinPixel() { this.chart.yAxis.toPixels(0.8 * this.minYValue) }
    get yTargetMaxPixel() { this.chart.yAxis.toPixels(1.2 * this.maxYValue) }
  }

  class Calc {
    constructor(chart) {
      this.chart = chart

      // Parameters
      this.consecutiveTrendPoints = 9;
      this.anomalyMaxGap = 4;
      this.anomalyMinLength = 5;

      const nonNull = chart.sampleYData.filter(y => y !== null);
      const [lower, median, upper] = math.quantileSeq(nonNull, [0.01, 0.5, 0.99]);
      this.lower = lower;
      this.median = median;
      this.upper = upper;

      const trendUpIndexes = this.findReverseConsecutive(y => y > this.median,
                                                         this.consecutiveTrendPoints);
      this.trendUp = new BoxZone(chart, trendUpIndexes);
    }

    // Indexes in reverse order
    findReverseConsecutive(criteria, consecutive) {
      const yData = this.chart.yData;
      const sampleXMaxIndex = this.chart.sampleXMaxIndex;

      let consecutiveAbove = [];
      for (let i = yData.length; i >= sampleXMaxIndex; i--) {
        if (criteria(yData[i])) {
          consecutiveAbove.push(i);
        } else {
          if (consecutiveAbove.length >= consecutive) {
            return consecutiveAbove;
          } else {
            consecutiveAbove = [];
          }
        }
      }
      return [];
    }

    // Indexes in reverse order
    findPoints(criteria) {
      const yData = this.chart.yData;
      const sampleXMaxIndex = this.chart.sampleXMaxIndex;

      let rslt = [];
      for (let i = yData.length; i >= sampleXMaxIndex; i--) {
        if (criteria(yData[i])) rslt.push(i);
      }
      return rslt;
    }

    get trendUpIndexes() { return this.findReverseConsecutive(y => y > this.median, 9) }
    get hasTrend() { return this.trendUpIndexes.length > 0 }
    get trendMinIndex() { return math.min(this.trendUpIndexes) }
    get trendMaxIndex() { return math.max(this.trendUpIndexes) }
    get trendYMin() {
      return math.min(this.chart.yData.slice(this.trendMinIndex, this.trendMaxIndex + 1));
    }
    get trendYMax() {
      return math.max(this.chart.yData.slice(this.trendMinIndex, this.trendMaxIndex + 1));
    }

    get anomalyIndexes() {
      return this.findPoints(y => y > 1.2 * this.upper || y < 0.8 * this.lower);
    }

    get anomalyArea() {
      const maxGap = this.anomalyMaxGap;
      const minLength = this.anomalyMinLength;

      let previous = null;
      let rslt = [];
      for (let i of this.anomalyIndexes) {
        if (!previous || previous <= i + maxGap) {
          rslt.push(i);
        } else {
          if (rslt.length >= minLength) return rslt;
          rslt = [i];
        }
        previous = i;
      }
      if (rslt.length >= minLength) {
        return rslt;
      } else {
        return [];
      }
    }

    get hasAnomaly() { return this.anomalyArea.length > 0 }
    get anomalyMinIndex() { return math.min(this.anomalyArea) }
    get anomalyMaxIndex() { return math.max(this.anomalyArea) }
    get anomalyYMin() {
      return math.min(this.chart.yData.slice(this.anomalyMinIndex, this.anomalyMaxIndex + 1));
    }
    get anomalyYMax() {
      return math.max(this.chart.yData.slice(this.anomalyMinIndex, this.anomalyMaxIndex + 1));
    }
  }

  class ControlChart {
    constructor(originalChart, focusSeriesIndex = 0) {
      this.chart = originalChart;
      this.xAxis = this.chart.xAxis[0];
      this.yAxis = this.chart.yAxis[0];
      this.series = this.chart.series[focusSeriesIndex];

      this.xAxisMin = this.xAxis.dataMin;
      this.xAxisMax = this.xAxis.dataMax;
      this.xData = this.series.xData;
      this.yData = this.series.yData;
      this.xIntervalInPixels = this.xAxis.toPixels(this.xData[1]) - this.xAxis.toPixels(this.xData[0]);

      // The fields below are going to be updated
      // when the user moves the window.
      this.sampleXMin = this.xAxisMin;
      this.sampleXMax = Math.floor(1/4 * (this.xAxisMax - this.xAxisMin) + this.xAxisMin);

      this.initDraw();
      this.addListeners();
    }

    destroy() {
      this.filling.destroy();
      this.minLine.destroy();
      this.maxLine.destroy();
      this.lowerLine.destroy();
      this.medianLine.destroy();
      this.upperLine.destroy();
      this.targetBox.destroy();
    }

    get xMaxIndex() { return this.xData.length - 1 }

    get sampleXData() { return this.xData.filter(x => x >= this.sampleXMin && x <= this.sampleXMax) }
    get sampleYData() { return this.yData.filter((_, i) => this.xData[i] >= this.sampleXMin && this.xData[i] <= this.sampleXMax) }
    get sampleXMinIndex() { return Math.max(0, this.xData.findIndex(x => x <= this.sampleXMin)) }
    get sampleXMaxIndex() { return this.xData.findIndex(x => x >= this.sampleXMax) }

    get calc() { return new Calc(this) }

    initDraw() {
      const calc = this.calc;

      this.filling = this.addVerticalArea(this.sampleXMinIndex, this.sampleXMaxIndex);
      this.minLine = this.addVerticalLine(this.sampleXMinIndex);
      this.maxLine = this.addVerticalLine(this.sampleXMaxIndex);

      this.lowerLine = this.addHorizontalLine(this.sampleXMaxIndex,
                                              this.xMaxIndex,
                                              calc.lower);
      this.medianLine = this.addHorizontalLine(this.sampleXMaxIndex,
                                               this.xMaxIndex,
                                               calc.median);
      this.upperLine = this.addHorizontalLine(this.sampleXMaxIndex,
                                              this.xMaxIndex,
                                              calc.upper);

      // Dummy values to be updated in `updateDraw`
      this.targetBox = this.addTargetArea(0, 1, 0, 1);

      this.updateDraw();
    }

    updateDraw() {
      const calc = this.calc;

      const xMinPixel = this.xAxis.toPixels(this.sampleXMin);
      const xMaxPixel = this.xAxis.toPixels(this.sampleXMax);
      const xLeftmostPixel = this.xAxis.toPixels(this.xData[this.xMaxIndex]);
      const yLowerPixel = this.yAxis.toPixels(calc.lower);
      const yMedianPixel = this.yAxis.toPixels(calc.median);
      const yUpperPixel = this.yAxis.toPixels(calc.upper);

      this.minLine.attr({x: xMinPixel});
      this.maxLine.attr({x: xMaxPixel});
      this.filling.attr({
        x: xMinPixel,
        width: xMaxPixel - xMinPixel
      });

      // If we have a trend, draw just the median
      // and hide the boundaries.
      if (calc.hasTrend) {
        this.medianLine.attr({
          visibility: "visible",
          d: `M ${xMaxPixel} ${yMedianPixel} L ${xLeftmostPixel} ${yMedianPixel}`
        });
        this.lowerLine.attr({visibility: "hidden"});
        this.upperLine.attr({visibility: "hidden"});
      } else {
        this.medianLine.attr({visibility: "hidden"});

        this.lowerLine.attr({
          visibility: "visible",
          d: `M ${xMaxPixel} ${yLowerPixel} L ${xLeftmostPixel} ${yLowerPixel}`
        });
        this.upperLine.attr({
          visibility: "visible",
          d: `M ${xMaxPixel} ${yUpperPixel} L ${xLeftmostPixel} ${yUpperPixel}`
        });
      }

      // Adjust the target box depending of if we
      // have a trend or an anomaly.
      if (calc.hasTrend) {
        const xTargetMinPixel = calc.trendUp.xTargetMinPixel;
        const xTargetMaxPixel = calc.trendUp.xTargetMaxPixel;
        const yTargetMinPixel = calc.trendUp.yTargetMinPixel;
        const yTargetMaxPixel = calc.trendUp.yTargetMaxPixel;

        this.targetBox.attr({
          visibility: "visible",
          x: xTargetMinPixel - 0.5 * this.xIntervalInPixels,
          y: yTargetMaxPixel,
          width: xTargetMaxPixel - xTargetMinPixel + this.xIntervalInPixels,
          height: yTargetMinPixel - yTargetMaxPixel
        });

      } else if (calc.hasAnomaly) {
        const xTargetMinPixel = this.xAxis.toPixels(this.xData[calc.anomalyMinIndex]);
        const xTargetMaxPixel = this.xAxis.toPixels(this.xData[calc.anomalyMaxIndex]);
        const yTargetMinPixel = this.yAxis.toPixels(0.8 * calc.anomalyYMin);
        const yTargetMaxPixel = this.yAxis.toPixels(1.2 * calc.anomalyYMax);

        this.targetBox.attr({
          visibility: "visible",
          x: xTargetMinPixel - 0.5 * this.xIntervalInPixels,
          y: yTargetMaxPixel,
          width: xTargetMaxPixel - xTargetMinPixel + this.xIntervalInPixels,
          height: yTargetMinPixel - yTargetMaxPixel
        });

      } else {
        this.targetBox.attr({visibility: "hidden"});
      }
    }

    addListeners() {
      const chart = this.chart;
      const minLine = this.minLine;
      const maxLine = this.maxLine;
      const filling = this.filling;

      minLine.element.addEventListener("mousedown", () => minLine.drag = true);
      maxLine.element.addEventListener("mousedown", () => maxLine.drag = true);
      filling.element.addEventListener("mousedown", () => filling.drag = true);

      document.addEventListener("mouseup", () => maxLine.drag = false);
      document.addEventListener("mouseup", () => minLine.drag = false);
      document.addEventListener("mouseup", () => filling.drag = false);

      chart.container.addEventListener("mousemove", (event) => {
        const normalizedEvent = chart.pointer.normalize(event);
        let sampleXMin = this.sampleXMin;
        let sampleXMax = this.sampleXMax;

        if (filling.drag && this.mouseOldX) {
          const mouseNewX = normalizedEvent.chartX;
          const oldX = this.xAxis.toValue(this.mouseOldX);
          const newX = this.xAxis.toValue(mouseNewX);
          const newPos = newX - oldX;
          sampleXMin += newPos;
          sampleXMax += newPos;
        }
        this.mouseOldX = normalizedEvent.chartX;

        if (minLine.drag) {
          sampleXMin = this.xAxis.toValue(normalizedEvent.chartX);
        }

        if (maxLine.drag) {
          sampleXMax = this.xAxis.toValue(normalizedEvent.chartX);
        }

        // Only accept the new positions if they are
        // inside the graph boundaries.
        if (sampleXMin >= this.xAxisMin && sampleXMax <= this.xAxisMax) {
          // Only redraw if we have something changing.
          if (this.sampleXMin != sampleXMin || this.sampleXMax != sampleXMax) {
            this.sampleXMin = sampleXMin;
            this.sampleXMax = sampleXMax;
            this.updateDraw();
          }
        }

      });
    }

    addHorizontalLine(xMinIndex, xMaxIndex, yValue) {
      const color = this.series.color;
      const xMin = this.xData[xMinIndex];
      const xMax = this.xData[xMaxIndex];
      const xMinPixel = this.xAxis.toPixels(xMin);
      const xMaxPixel = this.xAxis.toPixels(xMax);
      const yMinPixel = this.yAxis.toPixels(yValue);
      const yMaxPixel = this.yAxis.toPixels(yValue);
      return this.chart.renderer
                 .path(["M", xMinPixel, yMinPixel,
                        "L", xMaxPixel, yMaxPixel])
                 .attr({
                   'stroke-width': 1,
                   'stroke-dasharray': [4, 2],
                   'stroke': color,
                   'zIndex': 3
                 })
                 .add();
    }

    addVerticalLine(xIndex) {
      const color = this.series.color;
      const lineWidth = 5;

      const xPixel = this.xAxis.toPixels(this.xData[xIndex]);

      const options = {
        'stroke-width': 1,
        //'stroke-dasharray': [4, 2],
        'cursor': 'move',
        'stroke': color,
        'stroke-opacity': 0.7,
        'fill': color,
        'fill-opacity': 0.7,
        'zIndex': 4
      };

      return this.chart.renderer
                 .rect(xPixel, this.chart.plotTop,
                       lineWidth, this.chart.plotHeight)
                 .attr(options)
                 .add();
    }

    addVerticalArea(xMinIndex, xMaxIndex) {
      const color = this.series.color;
      const lineWidth = 5;

      const xMinPixel = this.xAxis.toPixels(this.xData[xMinIndex]);
      const xMaxPixel = this.xAxis.toPixels(this.xData[xMaxIndex]);

      return this.chart.renderer
                 .rect(xMinPixel + 2.5, this.chart.plotTop,
                       xMaxPixel - xMinPixel - 2.5, this.chart.plotHeight)
                 .attr({
                   'cursor': 'move',
                   'fill': color,
                   'fill-opacity': 0.2,
                   'zIndex': 3
                 })
                 .add();
    }

    addTargetArea(xMinIndex, xMaxIndex, yMin, yMax) {
      const color = this.series.color;

      const xMinPixel = this.xAxis.toPixels(this.xData[xMinIndex]);
      const xMaxPixel = this.xAxis.toPixels(this.xData[xMaxIndex]);
      const yMinPixel = this.yAxis.toPixels(yMin);
      const yMaxPixel = this.yAxis.toPixels(yMax);

      return this.chart.renderer
                 .rect(xMinPixel - 0.5 * this.xIntervalInPixels,
                       yMaxPixel,
                       xMaxPixel - xMinPixel + 0.5 * this.xIntervalInPixels,
                       yMinPixel - yMaxPixel)
                 .attr({
                   'stroke-width': 1,
                   'stroke': color,
                   'fill': color,
                   'fill-opacity': 0.2,
                   'zIndex': 3
                 })
                 .add();
    }
  }

  class Controller {
    constructor(chart) {
      this.chart = chart;
      this.activeLegend = null;
    }

    // Save legend events and replace by
    // other events
    focusModeOn() {
      if (!this.legendClick) {
        this.legendClick = [];
        const legends = this.chart.legend.allItems;
        for (let i = 0; i < legends.length; i++) {
          const element = legends[i].legendItem.element.parentElement;
          this.legendClick[i] = element.onclick;
          element.onclick = () => {
            if (this.controlChart) {
              this.controlChart.destroy();
              this.controlChart = null;
            }

            if (this.activeLegend === i) {
              this.activeLegend = null;
              for (let series of this.chart.series) {
                series.setVisible(true);
              }
            } else {
              for (let series of this.chart.series) {
                series.setVisible(false);
              }
              this.chart.series[i].setVisible(true);
              this.controlChart = new ControlChart(this.chart, i);
              this.activeLegend = i;
            }
          }
        }
      }
    }
  }

  // Initialize it on all charts
  for (let chart of Highcharts.charts) {
    new Controller(chart).focusModeOn();
  }
}, 500);
