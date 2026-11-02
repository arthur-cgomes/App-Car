const MONEY = /(-?R\$\s?-?[\d.,]+)/;

export function Masked({ text }: { text: string }) {
  return (
    <>
      {text.split(MONEY).map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="sensitive">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
