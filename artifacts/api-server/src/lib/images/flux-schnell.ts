import type { ImageGenerationParams, ImageGenerationResult, ImageProvider } from "./types.js";
import { ImageError } from "./types.js";

export class FluxSchnellProvider implements ImageProvider {
  readonly name = "flux-schnell";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  generate(_params: ImageGenerationParams): Promise<ImageGenerationResult> {
    throw new ImageError(
      "flux-schnell",
      "NOT_CONFIGURED",
      "Flux Schnell провайдер не подключён. Зарегистрируйтесь в Together AI и пополните депозит.",
    );
  }
}
