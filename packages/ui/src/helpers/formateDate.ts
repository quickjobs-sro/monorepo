const formateDate = (date: Date | string | undefined): string | undefined => {
    if (!date) return undefined;
    const d = typeof date === "string" ? new Date(date) : new Date(date);
    d.setHours(12, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  export { formateDate };