package sg.nus.carelink.profile.application;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import sg.nus.carelink.careplan.application.CarePlanLookup;
import sg.nus.carelink.careplan.domain.model.CarePlan;

/**
 * Test double for the cross-module contract: lets ProfileServiceTest control
 * each elder's latest plan without reaching into careplan's domain or infrastructure.
 */
class FakeCarePlanLookup implements CarePlanLookup {

    private final Map<Long, CarePlan> latestByElderId = new HashMap<>();

    void put(Long elderId, CarePlan plan) {
        latestByElderId.put(elderId, plan);
    }

    @Override
    public Optional<CarePlan> findLatestByElderId(Long elderId) {
        return Optional.ofNullable(latestByElderId.get(elderId));
    }
}
