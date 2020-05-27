export default function(key: string) {
  const results = new RegExp('[\\?&]' + key + '=([^&#]*)').exec(window.location.href);
  if (results == null) {
    return null;
  } else {
    return decodeURI(results[1]) || 0;
  }
}
