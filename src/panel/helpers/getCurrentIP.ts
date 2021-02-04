async function getCurrentIP(): Promise<string> {
  return new Promise((resolve, reject) => {
    fetch('https://www.cloudflare.com/cdn-cgi/trace')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.text();
      })
      .then(responseText => {
        const lines = responseText.split('\n');
        for (const line of lines) {
          if (line.startsWith('ip=')) {
            resolve(line.replace('ip=', ''));
            return;
          }
        }
      })
      .catch(error => {
        reject(error);
      });
  });
}

export { getCurrentIP };
