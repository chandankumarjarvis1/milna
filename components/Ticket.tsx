import { meetDate } from "@/lib/format";

interface TicketProps {
  withName: string;
  cafeName: string;
  area?: string | null;
  meetAt: string;
  footer?: React.ReactNode;
}

export default function Ticket({ withName, cafeName, area, meetAt, footer }: TicketProps) {
  const { day, time, weekday } = meetDate(meetAt);
  return (
    <article className="ticket px-5 pb-4 pt-5">
      <p className="text-sm font-semibold">Coffee with {withName}</p>
      <h3 className="mt-1 font-display text-3xl font-bold leading-tight">{cafeName}</h3>
      {area ? <p className="text-sm">{area}, Patna</p> : null}
      <div className="ticket-perf mt-6 flex items-end justify-between pt-4">
        <div>
          <p className="text-sm">{weekday}</p>
          <p className="font-display text-2xl font-bold">{day}</p>
        </div>
        <p className="font-display text-2xl font-bold">{time}</p>
      </div>
      {footer ? <div className="mt-3">{footer}</div> : null}
    </article>
  );
}
