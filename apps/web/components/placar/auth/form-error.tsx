export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="text-center text-sm text-danger">
      {message}
    </div>
  );
}
