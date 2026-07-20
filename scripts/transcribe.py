"""
Roda WhisperX sobre um audio e exporta:
  - um .srt (legenda tradicional)
  - um .words.json (timestamp por palavra, usado para legenda estilo "highlight")

WhisperX = whisper (transcricao) + wav2vec2 (forced alignment), o que deixa
o timestamp por palavra bem mais preciso que o whisper "puro" -- importante
pro estilo de legenda com destaque de palavra usado nesses videos.

Uso:
  python3 transcribe.py --audio narracao.mp3 --model base --out-srt legenda.srt --out-json legenda.words.json

Requisitos (instalar uma vez):
  pip install whisperx
"""
import argparse
import json

import whisperx


def format_srt_timestamp(seconds: float) -> str:
    """Converte segundos para o formato SubRip HH:MM:SS,mmm."""
    total_ms = round(seconds * 1000)
    hours, rem_ms = divmod(total_ms, 3_600_000)
    minutes, rem_ms = divmod(rem_ms, 60_000)
    secs, millis = divmod(rem_ms, 1_000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--model", default="base")
    parser.add_argument("--language", default="pt")
    parser.add_argument("--out-srt", required=True)
    parser.add_argument("--out-json", required=True)
    args = parser.parse_args()

    device = "cpu"
    compute_type = "int8"  # troque para "float16" se rodar em GPU

    # 1) transcricao bruta
    model = whisperx.load_model(args.model, device, compute_type=compute_type, language=args.language)
    audio = whisperx.load_audio(args.audio)
    result = model.transcribe(audio, language=args.language)

    # 2) forced alignment -- e aqui que o WhisperX ganha precisao por palavra
    align_model, align_metadata = whisperx.load_align_model(
        language_code=args.language, device=device
    )
    aligned = whisperx.align(
        result["segments"], align_model, align_metadata, audio, device
    )

    words = []
    srt_lines = []
    for i, segment in enumerate(aligned["segments"], start=1):
        srt_lines.append(str(i))
        srt_lines.append(
            f"{format_srt_timestamp(segment['start'])} --> {format_srt_timestamp(segment['end'])}"
        )
        srt_lines.append(segment["text"].strip())
        srt_lines.append("")

        for word in segment.get("words", []):
            # forced alignment pode deixar 'start'/'end' ausentes em palavras
            # muito curtas/ruido; ignoramos essas para nao quebrar a legenda
            if "start" not in word or "end" not in word:
                continue
            words.append({
                "word": word["word"].strip(),
                "startSeconds": word["start"],
                "endSeconds": word["end"],
            })

    with open(args.out_srt, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))

    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
