import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 38,
          background: "linear-gradient(135deg, #A855F7 0%, #6D28D9 60%, #4338CA 100%)",
        }}
      >
        <svg
          width="116"
          height="116"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17.35 5.45C18.53 3.42 21.47 3.42 22.65 5.45L35.42 27.55C36.6 29.58 35.13 32.12 32.78 32.12H7.22C4.87 32.12 3.4 29.58 4.58 27.55L17.35 5.45Z"
            fill="#FFFFFF"
          />
          <path d="M20 11.4L28.7 26.6H11.3L20 11.4Z" fill="#6D28D9" />
          <path d="M20 17.1L24.5 24.9H15.5L20 17.1Z" fill="#DDD6FE" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
