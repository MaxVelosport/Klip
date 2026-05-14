#!/usr/bin/env python3
"""Silero TTS synthesis script.
Usage: silero_synth.py <text> <speaker> <output_wav_path>
"""
import sys
import torch

def main():
    if len(sys.argv) != 4:
        print(f"Usage: {sys.argv[0]} <text> <speaker> <output.wav>", file=sys.stderr)
        sys.exit(1)

    text, speaker, out_path = sys.argv[1], sys.argv[2], sys.argv[3]

    model_path = "/home/deploy/projects/neuroclip/silero/models/v4_ru.pt"

    device = torch.device("cpu")
    model = torch.package.PackageImporter(model_path).load_pickle("tts_models", "model")
    model.to(device)

    sample_rate = 24000
    audio = model.apply_tts(text=text, speaker=speaker, sample_rate=sample_rate)

    import scipy.io.wavfile as wav
    import numpy as np
    wav.write(out_path, sample_rate, audio.numpy())


if __name__ == "__main__":
    main()
