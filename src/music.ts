const SC_URLS = [
  "https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/maoriboishido&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false",
  "https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/maoriboishido/cyber-rush&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false",
  "https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/maoriboishido/neon-dreams&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false"
];

export const getRandomSCUrl = () => {
    return SC_URLS[Math.floor(Math.random() * SC_URLS.length)];
};
