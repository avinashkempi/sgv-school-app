import { ScrollViewStyleReset, useServerDocumentContext } from "expo-router/html";
import { Helmet } from "expo-router/vendor/react-helmet-async/lib";

// This file is web-only and used to configure the root HTML for every
// web page during static rendering (e.g. `npx expo export --platform web`).
// The contents of this function only run in Node.js environments during export/SSR.
export default function Root({ children }) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <Helmet>
          <title>SGV School</title>
        </Helmet>
        <meta
          name="description"
          content="SGV School Portal - Comprehensive Academic Management System"
        />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
        */}
        <ScrollViewStyleReset />

        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
