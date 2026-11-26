import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: "linear-gradient(135deg, #9353FF 0%, #6D28D9 100%)",
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17.35 5.45C18.53 3.42 21.47 3.42 22.65 5.45L35.42 27.55C36.6 29.58 35.13 32.12 32.78 32.12H7.22C4.87 32.12 3.4 29.58 4.58 27.55L17.35 5.45Z"
            fill="#FFFFFF"
          />
          <path d="M20 12.2L27.5 25.8H12.5L20 12.2Z" fill="#7C3AED" />
          <path d="M20 17.5L23.8 24.3H16.2L20 17.5Z" fill="#FFFFFF" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
