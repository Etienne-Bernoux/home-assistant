# language: fr
@jinja
Fonctionnalité: Consignes météo et rappels de pluie

  Plan du scénario: Calcul des consignes à partir de prévisions simulées
    Alors le cas météo "<cas>" donne les consignes attendues

    Exemples:
      | cas |
      | AE1 hot tomorrow, mild night: shutters only |
      | AE2 mild tomorrow, dry night: nothing |
      | AE3 rain at 3 h and 0 °C at 6 h: laundry then tap |
      | thresholds are inclusive |
      | rain at 19 h or 8 h is outside the night |
      | rain at 20 h is inside the night |
      | rain at 7 h is inside the night |
      | frost at 8 h counts, at 9 h does not |
      | AE4 one reminder for a 15 h to 18 h episode |
      | AE5 two episodes split by four dry hours |
      | AE6 rain at 9 h is announced at 8 h |
      | AE7 rain at 21 h gives no daytime reminder |
      | rain at 19 h is announced at 17 h, not at 16 h or 18 h |
      | rain already falling before the candidate hour suppresses the reminder |
      | rain until 6 h then at 9 h is the same episode |
      | memory never moves ahead of the starting hour |
      | memory records a rainy starting hour at night |
      | drizzle below the threshold is dry |
