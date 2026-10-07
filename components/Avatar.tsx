interface AvatarProps {
  name: string;
  url: string | null;
  size?: number;
}

export default function Avatar({ name, url, size = 56 }: AvatarProps) {
  const style = { width: size, height: size };
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`${name}'s photo`}
        style={style}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div
      style={style}
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-mist font-display font-bold"
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
