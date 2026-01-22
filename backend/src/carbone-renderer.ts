import carbone from "carbone";
import path from "path";

export const renderWithCarbone = (
  data: unknown,
  templatePath: string,
  format: "pdf" | "html" = "pdf",
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    // Carbone options
    const options = {
      convertTo: format, // 'pdf' or 'html'
    };

    const absoluteTemplatePath = path.resolve(templatePath);

    carbone.render(absoluteTemplatePath, data as object, options, (err, result) => {
      if (err) {
        return reject(err);
      }
      if (Buffer.isBuffer(result)) {
        resolve(result);
      } else if (typeof result === "string") {
        resolve(Buffer.from(result));
      } else {
        reject(new Error("Unknown result type from carbone render"));
      }
    });
  });
};
