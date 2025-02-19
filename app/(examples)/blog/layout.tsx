export default function Layout({ children }) {
  return (
    <html>
      <head></head>
      <body className="bg-black p-8 font-mono text-white">{children}</body>
    </html>
  );
}
