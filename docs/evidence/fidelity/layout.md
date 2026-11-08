# Accepted-chart layout comparison

Local Chrome captures from the spacing branch `ae42427adc7b044ad2f367b85fc5c5b14b90e899`, compared with its integration base `f7190936db14e4306cb937c2805969854c2d9b49`. Both use the live local resolver and browser/Wasm chart for the synthetic June 21, 2000, 1:00 PM London birth, Tropical, equal divisions and Whole Sign houses.

At 1280×900, the unselected wheel remained 660×660px and moved from y=446.58–1106.58 to y=192.20–852.20, bringing it into the initial viewport. With a selection the wheel remained 574.41×574.41px and moved from y=446.58–1020.98 to y=192.20–766.61, alongside the details sidebar. `before-desktop.png`, `after-desktop.png` and `after-desktop-selection.png` record these states.

At 390×844, wheel bounds were unchanged at 343.22×343.22px, y=556.39–899.61, and page scroll width remained 390px. `after-mobile.png` and `after-mobile-half-wheel.png` show the mobile view and half-wheel. Mobile content still requires page scrolling.

These are local, single-chart layout observations; they do not establish final candidate, deployed or beta acceptance. The captures predate the later merged editorial packet and concern layout rather than editorial approval.
