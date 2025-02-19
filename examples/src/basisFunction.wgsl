fn basisFunction(i : i32, d : i32, t : f32, knotVector : array<f32, 8>) -> f32 {
  var N : array<f32, 8>;

  for (var j : i32 = 0; j <= d; j = j + 1)
  {
    if (t >= knotVector[i + j] && t < knotVector[i + j + 1])
    {
      N[j] = 1.0;
    } else {
      N[j] = 0.0;
    }
  }

  //Compute higher-degree basis functions iteratively
  for (var k : i32 = 1; k <= d; k = k + 1)
  {
    for (var j : i32 = 0; j <= d - k; j = j + 1)
    {
      let d1 = knotVector[i + j + k] - knotVector[i + j];
      let d2 = knotVector[i + j + k + 1] - knotVector[i + j + 1];

      let term1 = select(0.0, (t - knotVector[i + j]) / d1 * N[j], d1 > 0.0);
      let term2 = select(0.0, (knotVector[i + j + k + 1] - t) / d2 * N[j + 1], d2 > 0.0);

      N[j] = term1 + term2;
    }
  }

  return N[0];
}
