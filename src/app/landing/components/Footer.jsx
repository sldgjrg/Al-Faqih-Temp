"use client";

import React from "react";

const books = [
  {
    title: "Al-Amali",
    subtitle: "The Dictations of Sheikh Mufeed [d 413 AH]",
  },
  {
    title: "Al-Amali",
    subtitle: "The Dictations of Sheikh Tusi [d 460 AH]",
  },
  {
    title: "Al-Kafi",
    subtitle: "by Sheikh al-Kulayni [d 329 AH]",
  },
  {
    title: "Al-Khisal",
    subtitle: "by Sheikh Saduq [d 381 AH]",
  },
  {
    title: "Al-Tawhid",
    subtitle: "by Sheikh Saduq [d 381 AH]",
  },
  {
    title: "Fadail al-Shia",
    subtitle: "by Sheikh Saduq [d 381 AH]",
  },
  {
    title: "Kamil al-Ziyarat",
    subtitle: "by Ibn Qawlawayh [d 367 AH]",
  },
  {
    title: "Kitab al-Irshad",
    subtitle: "by Sheikh Mufeed [d 413 AH]",
  },
  {
    title: "Kitab al-Ghaiba",
    subtitle: "by Al-Nu'mani [d 360 AH]",
  },
  {
    title: "Kitab al-Ghaiba",
    subtitle: "by Sheikh Tusi [d 460 AH]",
  },
  {
    title: "Ma'ani al-Akhbar",
    subtitle: "by Sheikh Saduq [d 381 AH]",
  },
  {
    title: "Risaalat al-Huquq",
    subtitle: "by Imam Ali ibn Husayn (as) [d 95 AH]",
  },
  {
    title: "Sifat al-Shia",
    subtitle: "by Sheikh Saduq [d 381 AH]",
  },
  {
    title: "Thawaab al-A'mal wa I'qaab al-A'mal",
    subtitle: "by Sheikh Saduq [d 381 AH]",
  },
  {
    title: "Uyoon al-Akhbar al-Ridha",
    subtitle: "by Sheikh Saduq [d 381 AH]",
  },
];

const Footer = () => {
  // Duplicate the list so the animation can loop seamlessly.
  const duplicatedBooks = [...books, ...books];

  return (
    <div className="carousel-container">
      {/* Thin top streak effect */}
      <div className="top-streak" />
      <h2 className="carousel-heading">Al Faqih is Trained On</h2>
      <div className="carousel-track">
        {duplicatedBooks.map((book, idx) => (
          <div className="carousel-item" key={idx}>
            <h3>{book.title}</h3>
            <p>{book.subtitle}</p>
          </div>
        ))}
      </div>
      {/* CSS styles */}
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Onest:wght@100..900&display=swap");

        .carousel-container {
          position: relative;
          overflow: hidden;
          width: 100%;
          background: #010511;
          padding: 2rem 0;
        }
        /* Top streak effect */
        .top-streak {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          z-index: 3;
          background: linear-gradient(
            270deg,
            rgba(0, 153, 255, 0) 0%,
            rgba(0, 153, 255, 0.8) 50%,
            rgba(0, 153, 255, 0) 100%
          );
        }
        .carousel-heading {
          position: relative;
          z-index: 4;
          text-align: center;
          font-size: 3rem;
          margin-bottom: 2rem;
          font-weight: 400;
          color: #fff;
          font-family: "Onest", serif;
        }
        .carousel-track {
          position: relative;
          z-index: 4;
          display: flex;
          animation: scroll 30s linear infinite;
        }
        .carousel-track:hover {
          animation-play-state: paused;
        }
        .carousel-item {
          flex: 0 0 auto;
          background: #1b1e2b;
          margin: 0 1rem;
          padding: 2rem;
          border-radius: 10px;
          min-width: 300px;
          text-align: center;
          color: #fff;
          font-family: "Onest", serif;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .carousel-item h3 {
          margin: 0 0 0.5rem;
          font-weight: 400;
          font-size: 1.5rem;
        }
        .carousel-item p {
          margin: 0;
          opacity: 0.8;
          font-size: 1.1rem;
        }
        /* Mobile adjustments */
        @media (max-width: 768px) {
          .carousel-heading {
            font-size: 1.6rem;
          }
          .carousel-track {
            animation-duration: 10s;
          }
          .carousel-item h3 {
            font-size: 1rem;
          }
          .carousel-item p {
            font-size: 0.8rem;
          }
        }
        /* Adjusted keyframes for seamless looping */
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        /* Spotlight overlay to dim edges and highlight the center */
        .carousel-container::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 5;
          background: linear-gradient(
            to right,
            rgba(1, 1, 1, 0.8) 0%,
            transparent 30%,
            transparent 70%,
            rgba(1, 1, 1, 0.8) 100%
          );
        }
      `}</style>
    </div>
  );
};

export default Footer;