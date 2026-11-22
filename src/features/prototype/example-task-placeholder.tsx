/** UI-only mock-up: the task feature does not exist yet and nothing here is saved. */
export function ExampleTaskPlaceholder() {
  return (
    <div className="grid gap-4">
      <h3>Przykładowe zadanie</h3>
      <p className="record-caption">
        Makieta: zadania rekrutacyjne nie są jeszcze dostępne. Poniższe pola są tylko miejscem na
        przyszłą funkcję.
      </p>
      <section className="grid gap-2" aria-labelledby="example-task-heading">
        <h4 id="example-task-heading">Zadanie</h4>
        <p>
          [Miejsce na treść zadania] Opis przykładowego zadania, które pracodawca zleci kandydatowi.
        </p>
      </section>
      <section className="grid gap-2" aria-labelledby="example-result-heading">
        <h4 id="example-result-heading">Wynik</h4>
        <p>
          [Miejsce na wynik] Tu pojawi się rozwiązanie przesłane przez kandydata. Na razie brak
          wyniku.
        </p>
      </section>
    </div>
  );
}
