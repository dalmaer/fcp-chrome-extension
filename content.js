// guard against double-inclusion and making sure that the chrome runtime is available
if (
  typeof po == "undefined" &&
  typeof chrome.runtime == "object" &&
  typeof chrome.runtime.sendMessage == "function"
) {
  // Create the PerformanceObserver instance.
  const po = new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntriesByName("first-contentful-paint")) {
      // Send the FCP to the background page
      let fcp = Math.floor(entry.startTime);
      chrome.runtime.sendMessage({ result: fcp });
      console.log("FCP:", fcp, "ms");
      po.disconnect();
    }
  });

  // Observe entries of type `paint`, including buffered
  // entries, i.e. entries that occurred before calling `observe()`.
  po.observe({ type: "paint", buffered: true });
}
