setTimeout(function() {
  "use strict";

  class BoxZone {
    constructor(chart, indexes) {
      this.chart = chart;
      this.indexes = indexes;

      this.tickSize = chart.xAxis.toPixels(chart.xData[1]) - chart.xAxis.toPixels(chart.xData[0]);
    }

    get hasData() { return this.indexes.length > 0 }
    get minIndex() { return math.min(this.indexes) }
    get maxIndex() { return math.max(this.indexes) }

    get minYValue() { return math.min(this.chart.yData.slice(this.minIndex, this.maxIndex + 1)) }
    get maxYValue() { return math.max(this.chart.yData.slice(this.minIndex, this.maxIndex + 1)) }
    get minXValue() { return this.chart.xData[this.minIndex] }
    get maxXValue() { return this.chart.xData[this.maxIndex] }

    // The magic numbers below just provide some
    // extra room for the box. Othewise the borders
    // would be right on top of the values we are
    // interested on.
    get xTargetMinPixel() { return this.chart.xAxis.toPixels(this.minXValue) - 0.5 * this.tickSize }
    get xTargetMaxPixel() { return this.chart.xAxis.toPixels(this.maxXValue) + 0.5 * this.tickSize }
    get yTargetMinPixel() { return math.min(this.chart.yAxis.toPixels(0.8 * this.minYValue), this.chart.bottomPixel) }
    get yTargetMaxPixel() { return math.max(this.chart.yAxis.toPixels(1.2 * this.maxYValue), this.chart.topPixel) }
  }

  class Calc {
    constructor(chart) {
      this.chart = chart

      // Parameters
      this.consecutiveTrendPoints = 10;
      this.outOfControlMaxGap = 4;
      this.outOfControlMinLength = 5;

      const nonNull = chart.sampleYData.filter(y => y !== null);
      const [lower, median, upper] = math.quantileSeq(nonNull, [0.01, 0.5, 0.99]);
      this.lower = lower;
      this.median = median;
      this.upper = upper;

      this.aboveNormal = new BoxZone(chart, this.aboveNormalIndexes);
      this.belowNormal = new BoxZone(chart, this.belowNormalIndexes);
      this.outOfControl = new BoxZone(chart, this.outOfControlIndexes);
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

    get aboveNormalIndexes() {
      return this.findReverseConsecutive(y => y > this.median, this.consecutiveTrendPoints);
    }

    get belowNormalIndexes() {
      return this.findReverseConsecutive(y => y < this.median, this.consecutiveTrendPoints);
    }

    get outOfControlIndexes() {
      const indexes = this.findPoints(y => y > 1.2 * this.upper || y < 0.8 * this.lower);
      const maxGap = this.outOfControlMaxGap;
      const minLength = this.outOfControlMinLength;

      let previous = null;
      let rslt = [];
      for (let i of indexes) {
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
  }

  class ControlChart {
    constructor(originalChart, focusSeriesIndex = 0) {
      this.chart = originalChart;
      this.xAxis = this.chart.xAxis[0];
      this.yAxis = this.chart.yAxis[0];
      this.series = this.chart.series[focusSeriesIndex];

      this.xDataMin = this.xAxis.dataMin;
      this.xDataMax = this.xAxis.dataMax;
      this.xData = this.series.xData;
      this.yData = this.series.yData;
      this.topPixel = this.chart.plotTop;
      this.bottomPixel = this.topPixel + this.chart.plotHeight;
      this.xIntervalInPixels = this.xAxis.toPixels(this.xData[1]) - this.xAxis.toPixels(this.xData[0]);

      // The two fields below are going to be updated
      // when the user moves the "normal zone" window.
      // This is just a fairly good default.
      this.sampleXMin = this.xDataMin;
      this.sampleXMax = Math.floor(1/4 * (this.xDataMax - this.xDataMin) + this.xDataMin);

      this.initDraw();
      this.addListeners();
    }

    get xMaxIndex() { return this.xData.length - 1 }

    get sampleXData() { return this.xData.filter(x => x >= this.sampleXMin && x <= this.sampleXMax) }
    get sampleYData() { return this.yData.filter((_, i) => this.xData[i] >= this.sampleXMin && this.xData[i] <= this.sampleXMax) }
    get sampleXMinIndex() { return Math.max(0, this.xData.findIndex(x => x <= this.sampleXMin)) }
    get sampleXMaxIndex() { return this.xData.findIndex(x => x >= this.sampleXMax) }

    get calc() { return new Calc(this) }

    // Everything that's on screen (even invisible) should be draw here.
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

    // This one runs every time we drag the "normal zone" window.
    // It should update everything declared in "initDraw".
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
      if (calc.aboveNormal.hasData || calc.belowNormal.hasData) {
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
      // have a above or below normal or out of
      // control regions.
      if (calc.aboveNormal.hasData && calc.belowNormal.hasData) {
        this.showTargetBox();
        // If we have both, show the latest zone
        if (calc.aboveNormal.maxXValue > calc.belowNormal.maxXValue) {
          this.updateTargetBox(calc.aboveNormal);
        } else {
          this.updateTargetBox(calc.belowNormal);
        }
      } else if (calc.belowNormal.hasData) {
        this.showTargetBox();
        this.updateTargetBox(calc.belowNormal);
      } else if (calc.aboveNormal.hasData) {
        this.showTargetBox();
        this.updateTargetBox(calc.aboveNormal);
      } else if (calc.outOfControl.hasData) {
        this.showTargetBox();
        this.updateTargetBox(calc.outOfControl);
      } else {
        this.hideTargetBox();
      }
    }

    // Destroy everything from "initDraw"
    destroy() {
      this.filling.destroy();
      this.minLine.destroy();
      this.maxLine.destroy();
      this.lowerLine.destroy();
      this.medianLine.destroy();
      this.upperLine.destroy();
      this.targetBox.destroy();
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

        // Only accept the new positions if they are inside chart boundaries.
        if (sampleXMin >= this.xDataMin && sampleXMax <= this.xDataMax) {
          // Only redraw if something have changed.
          if (this.sampleXMin != sampleXMin || this.sampleXMax != sampleXMax) {
            this.sampleXMin = sampleXMin;
            this.sampleXMax = sampleXMax;
            this.updateDraw();
          }
        }
      });
    }

    updateTargetBox(boxZone) {
      const xTargetMinPixel = boxZone.xTargetMinPixel;
      const xTargetMaxPixel = boxZone.xTargetMaxPixel;
      const yTargetMinPixel = boxZone.yTargetMinPixel;
      const yTargetMaxPixel = boxZone.yTargetMaxPixel;

      this.targetBox.attr({
        x: xTargetMinPixel,
        y: yTargetMaxPixel,
        width: xTargetMaxPixel - xTargetMinPixel,
        height: yTargetMinPixel - yTargetMaxPixel
      });
    }

    showTargetBox() {
      this.targetBox.attr({visibility: "visible"});
    }

    hideTargetBox() {
      this.targetBox.attr({visibility: "hidden"});
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
                 .rect(xPixel, this.topPixel,
                       lineWidth, this.bottomPixel - this.topPixel)
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
