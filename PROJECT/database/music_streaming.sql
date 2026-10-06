-- Optional MySQL schema if you later want to move songs from db.js into a real database.
CREATE DATABASE IF NOT EXISTS music_streaming;
USE music_streaming;

CREATE TABLE IF NOT EXISTS songs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  genre VARCHAR(100),
  url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FULLTEXT KEY ft_search (title, artist, genre)
);

INSERT INTO songs (title, artist, genre, url) VALUES
('Neon Horizon','SoundHelix','Electronic','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
('Midnight Drive','SoundHelix','Synthwave','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'),
('Golden Hour','SoundHelix','Chill','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3');

-- Search example:
-- SELECT * FROM songs WHERE title LIKE '%neon%' OR artist LIKE '%neon%';
